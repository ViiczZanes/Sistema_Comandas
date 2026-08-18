import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { formatCents } from "@/lib/money";

const updateSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().nonnegative().optional(),
  image: z.string().optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 }
    );
  }

  const product = await prisma.product
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);

  if (!product) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 }
    );
  }

  // Auditoria só do que muda dinheiro ou visibilidade no cardápio — não
  // vale logar todo campo (ex: reordenar não importa pra esse histórico).
  const changes: string[] = [];
  if (parsed.data.priceCents !== undefined && parsed.data.priceCents !== before.priceCents) {
    changes.push(`preço ${formatCents(before.priceCents)} → ${formatCents(product.priceCents)}`);
  }
  if (parsed.data.active !== undefined && parsed.data.active !== before.active) {
    changes.push(product.active ? "reativado" : "desativado");
  }
  if (parsed.data.name !== undefined && parsed.data.name !== before.name) {
    changes.push(`nome "${before.name}" → "${product.name}"`);
  }
  if (changes.length > 0) {
    logAction({
      userId: user.id,
      action: "product.update",
      entityType: "Product",
      entityId: product.id,
      summary: `Editou o produto "${before.name}" (${changes.join(", ")})`,
    });
  }

  return NextResponse.json(product);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  const before = await prisma.product.findUnique({ where: { id } });

  try {
    await prisma.product.delete({ where: { id } });
    if (before) {
      logAction({
        userId: user.id,
        action: "product.delete",
        entityType: "Product",
        entityId: id,
        summary: `Excluiu o produto "${before.name}"`,
      });
    }
  } catch {
    // Produto já usado em pedidos: preferimos desativar a excluir, para não
    // perder o histórico. Marca como inativo em vez de falhar sem explicar.
    const product = await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    logAction({
      userId: user.id,
      action: "product.update",
      entityType: "Product",
      entityId: id,
      summary: `Desativou o produto "${product.name}" (tinha pedidos no histórico, não pôde excluir)`,
    });
    return NextResponse.json({
      ok: true,
      note: "Produto tem pedidos no histórico; foi desativado em vez de excluído.",
      product,
    });
  }

  return NextResponse.json({ ok: true });
}
