import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { hashPassword } from "@/lib/auth";

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

  return NextResponse.json(updated);
}
