import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { hashPassword } from "@/lib/auth";
import { logAction } from "@/lib/auditLog";

const ROLE_LABEL = {
  ADMIN: "Administrador",
  WAITER: "PDV / Caixa",
  KITCHEN: "Cozinha",
} as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "WAITER", "KITCHEN"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user: currentUser, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (id === currentUser.id && parsed.data.active === false) {
    return NextResponse.json(
      { error: "Você não pode desativar seu próprio usuário." },
      { status: 400 }
    );
  }

  const before = await prisma.user.findFirst({
    where: { id, restaurantId: currentUser.restaurantId },
  });
  if (!before) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) {
    data.passwordHash = await hashPassword(password);
  }

  const updated = await prisma.user
    .update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    })
    .catch(() => null);

  if (!updated) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  const changes: string[] = [];
  if (parsed.data.role !== undefined && parsed.data.role !== before.role) {
    changes.push(`papel ${ROLE_LABEL[before.role]} → ${ROLE_LABEL[updated.role]}`);
  }
  if (parsed.data.active !== undefined && parsed.data.active !== before.active) {
    changes.push(updated.active ? "reativado" : "desativado");
  }
  if (password) {
    changes.push("senha redefinida");
  }
  if (changes.length > 0) {
    logAction({
      restaurantId: currentUser.restaurantId,
      userId: currentUser.id,
      action: "user.update",
      entityType: "User",
      entityId: updated.id,
      summary: `Editou o usuário "${updated.name}" (${changes.join(", ")})`,
    });
  }

  return NextResponse.json(updated);
}
