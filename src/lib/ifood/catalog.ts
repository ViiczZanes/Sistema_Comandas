import "server-only";
import { prisma } from "@/lib/prisma";
import { getIfoodAccessToken } from "./auth";
import {
  listCatalogs,
  listCategories,
  createCategory,
  renameCategory,
  putItem,
  uploadImage,
  type IfoodOptionGroupInput,
  type IfoodOptionInput,
} from "./catalogClient";
import { IfoodApiError } from "./client";
import { ifoodCategoryId, ifoodItemId, ifoodOptionGroupId, ifoodOptionId } from "./catalogIds";
import type { Category, Product, ProductOption } from "@/generated/prisma/client";

// Sincronização do cardápio (categorias/produtos/opções/imagens) pro
// catálogo do iFood (Catalog API v2) — só nesse sentido, sistema →
// iFood. Ver plano/decisões em `roadmap-futuro.md` e o comentário no
// topo de catalogClient.ts pros detalhes de payload confirmados contra
// o sandbox real.

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // limite do iFood
const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function toReais(cents: number): number {
  return Math.round(cents) / 100;
}

type IfoodTokenCtx = { token: string; merchantId: string };

async function getSyncContext(restaurantId: string): Promise<IfoodTokenCtx | null> {
  const integration = await prisma.ifoodIntegration.findUnique({ where: { restaurantId } });
  if (!integration || !integration.enabled || !integration.merchantId) return null;
  const token = await getIfoodAccessToken(restaurantId);
  return { token, merchantId: integration.merchantId };
}

/** Garante que a imagem do produto está no iFood, reaproveitando o
 * cache (`ifoodImagePath`/`ifoodImageSourceUrl`) se `image` não mudou
 * desde a última sincronização. Nunca lança — imagem é best-effort,
 * uma falha aqui não deve derrubar o item inteiro (fica sem imagem). */
async function ensureImageSynced(
  ctx: IfoodTokenCtx,
  product: Pick<Product, "id" | "image" | "ifoodImagePath" | "ifoodImageSourceUrl">
): Promise<string | undefined> {
  if (!product.image) return undefined;
  if (product.image === product.ifoodImageSourceUrl && product.ifoodImagePath) {
    return product.ifoodImagePath;
  }

  try {
    const ext = product.image.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
    const mimeType = IMAGE_MIME_BY_EXT[ext];
    if (!mimeType) {
      console.warn(`[ifood-catalog] imagem do produto ${product.id} ignorada — extensão "${ext}" não suportada (só jpg/jpeg/png).`);
      return product.ifoodImagePath ?? undefined;
    }

    const imgRes = await fetch(product.image);
    if (!imgRes.ok) {
      console.warn(`[ifood-catalog] falha ao baixar imagem do produto ${product.id}: HTTP ${imgRes.status}`);
      return product.ifoodImagePath ?? undefined;
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      console.warn(`[ifood-catalog] imagem do produto ${product.id} ignorada — maior que 5MB.`);
      return product.ifoodImagePath ?? undefined;
    }

    const imagePath = await uploadImage(ctx.token, ctx.merchantId, buffer.toString("base64"), mimeType);
    await prisma.product.update({
      where: { id: product.id },
      data: { ifoodImagePath: imagePath, ifoodImageSourceUrl: product.image },
    });
    return imagePath;
  } catch (err) {
    console.warn(`[ifood-catalog] falha ao sincronizar imagem do produto ${product.id}:`, err);
    return product.ifoodImagePath ?? undefined;
  }
}

/** Monta os grupos de opção "Adicionais" (soma preço) e "Remover"
 * (preço sempre R$0) a partir da lista plana de ProductOption — ver
 * ressalva no plano: o modelo de opções do iFood é aditivo por
 * natureza, "Remover" é a aproximação possível, não idêntica ao que o
 * próprio iFood faria nativamente. */
function buildOptionGroups(
  productId: string,
  productOptions: ProductOption[]
): { optionGroups: IfoodOptionGroupInput[]; options: IfoodOptionInput[] } {
  const optionGroups: IfoodOptionGroupInput[] = [];
  const options: IfoodOptionInput[] = [];

  const additional = productOptions.filter((o) => o.type === "ADDITIONAL");
  const removable = productOptions.filter((o) => o.type === "REMOVABLE");

  if (additional.length > 0) {
    const groupId = ifoodOptionGroupId(productId, "additional");
    optionGroups.push({
      id: groupId,
      name: "Adicionais",
      externalCode: `${productId}:additional`,
      status: "AVAILABLE",
      min: 0,
      max: additional.length,
      optionIds: additional.map((o) => ifoodOptionId(o.id)),
    });
    for (const o of additional) {
      options.push({
        id: ifoodOptionId(o.id),
        productId: ifoodOptionId(o.id),
        externalCode: o.id,
        status: "AVAILABLE",
        priceValue: toReais(o.priceCents),
        name: o.name,
      });
    }
  }

  if (removable.length > 0) {
    const groupId = ifoodOptionGroupId(productId, "removable");
    optionGroups.push({
      id: groupId,
      name: "Remover",
      externalCode: `${productId}:removable`,
      status: "AVAILABLE",
      min: 0,
      max: removable.length,
      optionIds: removable.map((o) => ifoodOptionId(o.id)),
    });
    for (const o of removable) {
      options.push({
        id: ifoodOptionId(o.id),
        productId: ifoodOptionId(o.id),
        externalCode: o.id,
        status: "AVAILABLE",
        priceValue: 0, // Removível nunca muda preço no nosso sistema
        name: o.name,
      });
    }
  }

  return { optionGroups, options };
}

/** Sincroniza um produto só (imagem + item + opções). Reaproveitada
 * pelo sync completo e pelo push automático de disponibilidade (ver
 * PATCH /api/products/[id]). Produto inativo (`active=false`) não é
 * enviado — fica de fora do catálogo do iFood por completo, decisão do
 * plano aprovado. */
export async function syncSingleProductToIfood(
  restaurantId: string,
  productId: string,
  ctxIn?: IfoodTokenCtx
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = ctxIn ?? (await getSyncContext(restaurantId));
  if (!ctx) return { ok: false, error: "Integração com o iFood não está conectada." };

  const product = await prisma.product.findFirst({
    where: { id: productId, restaurantId },
    include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return { ok: false, error: "Produto não encontrado." };

  // Sincronização em massa (`syncCatalogToIfood`) só passa por aqui
  // produtos ativos (filtro já na query) — nunca cria no iFood algo que
  // nunca esteve ativo. Mas essa função também é chamada direto por id
  // no push automático de disponibilidade (ver rotas de produto): um
  // produto que ACABOU de ser desativado precisa continuar chegando
  // até aqui pra virar `UNAVAILABLE` do lado do iFood — se só
  // devolvesse `ok` sem fazer nada, um item já sincronizado ficaria
  // "disponível" pra sempre depois de desativado aqui.
  try {
    const imagePath = await ensureImageSynced(ctx, product);
    const { optionGroups, options } = buildOptionGroups(product.id, product.options);

    await putItem(ctx.token, ctx.merchantId, {
      id: ifoodItemId(product.id),
      categoryId: ifoodCategoryId(product.categoryId),
      externalCode: product.id,
      status: !product.active || product.soldOut ? "UNAVAILABLE" : "AVAILABLE",
      priceValue: toReais(product.priceCents),
      name: product.name,
      description: product.description ?? undefined,
      imagePath,
      optionGroups,
      options,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof IfoodApiError ? err.message : String((err as Error)?.message ?? err);
    return { ok: false, error: message.slice(0, 400) };
  }
}

async function ensureCategorySynced(
  ctx: IfoodTokenCtx,
  catalogId: string,
  existing: Map<string, string>, // ifoodCategoryId -> nome atual no iFood
  category: Pick<Category, "id" | "name">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = ifoodCategoryId(category.id);
  const currentName = existing.get(id);

  if (currentName === undefined) {
    try {
      await createCategory(ctx.token, ctx.merchantId, catalogId, {
        id,
        name: category.name,
        externalCode: category.id,
        status: "AVAILABLE",
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof IfoodApiError ? err.message : String((err as Error)?.message ?? err);
      return { ok: false, error: message.slice(0, 400) };
    }
  }

  if (currentName !== category.name) {
    // Best-effort — endpoint de renomear não está 100% confirmado
    // contra o sandbox (ver catalogClient.ts); se não existir/der
    // erro, a categoria só fica com o nome antigo do lado do iFood até
    // isso ser confirmado, não trava o resto da sincronização.
    await renameCategory(ctx.token, ctx.merchantId, catalogId, id, category.name).catch((err) => {
      console.warn(`[ifood-catalog] não foi possível renomear a categoria "${category.name}" no iFood:`, err);
    });
  }

  return { ok: true };
}

export type CatalogSyncResult = {
  ok: boolean;
  categoriesSynced: number;
  itemsSynced: number;
  errors: { productName: string; message: string }[];
};

/** Sincronização completa do cardápio — disparada manualmente pelo
 * Administrador em /admin/ifood. Categorias primeiro (os itens
 * precisam de um categoryId válido do lado do iFood pra existir),
 * depois cada produto. Uma falha isolada (imagem que não carrega, um
 * produto com dado inválido) não derruba os demais — mesmo padrão de
 * `pollAllRestaurants` em poller.ts. */
export async function syncCatalogToIfood(restaurantId: string): Promise<CatalogSyncResult> {
  const ctx = await getSyncContext(restaurantId);
  if (!ctx) {
    return {
      ok: false,
      categoriesSynced: 0,
      itemsSynced: 0,
      errors: [{ productName: "-", message: "Integração com o iFood não está conectada." }],
    };
  }

  const errors: CatalogSyncResult["errors"] = [];
  let categoriesSynced = 0;
  let itemsSynced = 0;

  try {
    const catalogs = await listCatalogs(ctx.token, ctx.merchantId);
    const catalogId = catalogs[0]?.catalogId;
    if (!catalogId) throw new Error("Nenhum catálogo encontrado pra essa loja no iFood.");

    const existingCategories = await listCategories(ctx.token, ctx.merchantId, catalogId);
    const existingByIfoodId = new Map(existingCategories.map((c) => [c.id, c.name]));

    const categories = await prisma.category.findMany({
      where: { restaurantId, active: true },
      include: { products: { where: { active: true } } },
      orderBy: { sortOrder: "asc" },
    });

    for (const category of categories) {
      const result = await ensureCategorySynced(ctx, catalogId, existingByIfoodId, category);
      if (!result.ok) {
        errors.push({ productName: `Categoria "${category.name}"`, message: result.error });
        continue; // produtos dessa categoria também vão falhar sem ela — não tenta
      }
      categoriesSynced++;

      for (const product of category.products) {
        const productResult = await syncSingleProductToIfood(restaurantId, product.id, ctx);
        if (productResult.ok) {
          itemsSynced++;
        } else {
          errors.push({ productName: product.name, message: productResult.error });
        }
      }
    }
  } catch (err) {
    const message = err instanceof IfoodApiError ? err.message : String((err as Error)?.message ?? err);
    errors.push({ productName: "-", message: message.slice(0, 400) });
  }

  const summary =
    errors.length === 0
      ? null
      : `${errors.length} problema(s): ${errors
          .slice(0, 3)
          .map((e) => `${e.productName} (${e.message.slice(0, 80)})`)
          .join("; ")}${errors.length > 3 ? "…" : ""}`;

  await prisma.ifoodIntegration.update({
    where: { restaurantId },
    data: { lastCatalogSyncAt: new Date(), lastCatalogSyncError: summary },
  });

  return { ok: errors.length === 0, categoriesSynced, itemsSynced, errors };
}
