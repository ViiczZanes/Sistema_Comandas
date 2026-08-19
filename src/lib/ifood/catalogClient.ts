import "server-only";
import { IfoodApiError } from "./client";

// Wrappers finos pra Catalog API v2 do iFood — só a chamada HTTP em si,
// nenhuma lógica de negócio aqui (isso fica em catalog.ts). Endpoints e
// formato exato do payload confirmados contra o sandbox real durante a
// implementação (não só copiados da doc pública, que aqui também
// induzia a erro em mais de um ponto — ver comentários abaixo):
//
// - Categoria usa POST (não PUT) e dá 409 se já existir outra com o
//   MESMO NOME no catálogo (não é idempotente por id como o resto).
// - Item é criado/atualizado com um payload único (`PUT /items`) que
//   carrega junto: o item em si, os "products" (o item principal E cada
//   opção têm sua própria entrada aqui, todos como "produtos"), os
//   `optionGroups` (grupos de opção, com `optionIds` referenciando as
//   opções) e `options` (cada opção individual, com preço e
//   `productId` — sempre igual ao próprio id) — os quatro são chaves
//   irmãs no mesmo nível do payload, não aninhadas umas dentro das
//   outras. O produto do item referencia o grupo via
//   `optionGroups: [{id, min, max}]` (precisa repetir min/max aqui,
//   além de no grupo em si).
// - Upload de imagem espera o campo `image` como data URI completa
//   (`data:image/png;base64,...`), não só o base64 cru.

const BASE_URL = "https://merchant-api.ifood.com.br/catalog/v2.0";

async function catalogFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new IfoodApiError(
      `iFood ${init.method ?? "GET"} ${path} → HTTP ${res.status}: ${body.slice(0, 500)}`,
      res.status
    );
  }
  return res;
}

export type IfoodCatalog = { catalogId: string; status: string };

/** Todo merchant tem pelo menos um catálogo "DEFAULT" — é nele que
 * categorias/itens são criados. Buscado uma vez por sincronização. */
export async function listCatalogs(accessToken: string, merchantId: string): Promise<IfoodCatalog[]> {
  const res = await catalogFetch(accessToken, `/merchants/${merchantId}/catalogs`);
  return res.json();
}

export type IfoodCategorySummary = { id: string; name: string; status: string };

export async function listCategories(
  accessToken: string,
  merchantId: string,
  catalogId: string
): Promise<IfoodCategorySummary[]> {
  const res = await catalogFetch(
    accessToken,
    `/merchants/${merchantId}/catalogs/${catalogId}/categories`
  );
  return res.json();
}

export async function createCategory(
  accessToken: string,
  merchantId: string,
  catalogId: string,
  category: { id: string; name: string; externalCode: string; status: "AVAILABLE" | "UNAVAILABLE" }
): Promise<void> {
  await catalogFetch(accessToken, `/merchants/${merchantId}/catalogs/${catalogId}/categories`, {
    method: "POST",
    body: JSON.stringify({
      id: category.id,
      name: category.name,
      externalCode: category.externalCode,
      status: category.status,
      index: 0,
      template: "DEFAULT",
    }),
  });
}

/** Renomeia uma categoria já existente. Endpoint não confirmado contra
 * o sandbox (a doc pública não deixa claro se/como isso é feito) — quem
 * chama trata 404/405 como "sem suporte a rename por enquanto" e segue
 * a sincronização sem travar (ver catalog.ts). */
export async function renameCategory(
  accessToken: string,
  merchantId: string,
  catalogId: string,
  categoryId: string,
  name: string
): Promise<void> {
  await catalogFetch(
    accessToken,
    `/merchants/${merchantId}/catalogs/${catalogId}/categories/${categoryId}`,
    { method: "PATCH", body: JSON.stringify({ name }) }
  );
}

export type IfoodOptionGroupInput = {
  id: string;
  name: string;
  externalCode: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  min: number;
  max: number;
  optionIds: string[];
};

export type IfoodOptionInput = {
  id: string;
  productId: string;
  externalCode: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  priceValue: number; // reais decimais
  name: string;
};

export type IfoodItemInput = {
  id: string;
  categoryId: string;
  externalCode: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  priceValue: number; // reais decimais
  name: string;
  description?: string;
  imagePath?: string;
  optionGroups?: IfoodOptionGroupInput[];
  options?: IfoodOptionInput[];
};

/** Cria ou atualiza um item por completo — categoria, preço,
 * disponibilidade, imagem e grupos de opção, tudo numa chamada só.
 * Idempotente: chamar de novo com o mesmo `id` atualiza em vez de
 * duplicar (confirmado contra o sandbox). */
export async function putItem(
  accessToken: string,
  merchantId: string,
  input: IfoodItemInput
): Promise<void> {
  const itemProduct: Record<string, unknown> = {
    id: input.id,
    name: input.name,
    externalCode: input.externalCode,
  };
  if (input.description) itemProduct.description = input.description;
  if (input.imagePath) itemProduct.imagePath = input.imagePath;
  if (input.optionGroups && input.optionGroups.length > 0) {
    itemProduct.optionGroups = input.optionGroups.map((g) => ({
      id: g.id,
      min: g.min,
      max: g.max,
    }));
  }

  const optionProducts = (input.options ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    externalCode: o.externalCode,
  }));

  const body: Record<string, unknown> = {
    item: {
      id: input.id,
      productId: input.id,
      categoryId: input.categoryId,
      status: input.status,
      price: { value: input.priceValue },
      externalCode: input.externalCode,
    },
    products: [itemProduct, ...optionProducts],
  };
  if (input.optionGroups && input.optionGroups.length > 0) {
    body.optionGroups = input.optionGroups.map((g) => ({
      id: g.id,
      name: g.name,
      externalCode: g.externalCode,
      status: g.status,
      min: g.min,
      max: g.max,
      optionIds: g.optionIds,
    }));
  }
  if (input.options && input.options.length > 0) {
    body.options = input.options.map((o) => ({
      id: o.id,
      status: o.status,
      productId: o.productId,
      price: { value: o.priceValue },
      externalCode: o.externalCode,
    }));
  }

  await catalogFetch(accessToken, `/merchants/${merchantId}/items`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Sobe uma imagem (jpg/jpeg/png, até 5MB) e devolve o `imagePath` pra
 * referenciar em `putItem`. `imageBase64` já vem só com os bytes (sem
 * o prefixo `data:...;base64,`) — este wrapper monta a data URI, que é
 * o formato que o endpoint espera de verdade. */
export async function uploadImage(
  accessToken: string,
  merchantId: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const res = await catalogFetch(accessToken, `/merchants/${merchantId}/image/upload`, {
    method: "POST",
    body: JSON.stringify({ image: `data:${mimeType};base64,${imageBase64}` }),
  });
  const data = (await res.json()) as { imagePath: string };
  return data.imagePath;
}
