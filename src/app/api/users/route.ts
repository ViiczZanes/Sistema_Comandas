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

export async function GET() {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "WAITER", "KITCHEN"]),
});

export async function POST(request: Request) {
  const { user: currentUser, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um usuário com esse e-mail." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  logAction({
    userId: currentUser.id,
    action: "user.create",
    entityType: "User",
    entityId: user.id,
    summary: `Criou o usuário "${user.name}" (${ROLE_LABEL[user.role]})`,
  });

  return NextResponse.json(user, { status: 201 });
}
