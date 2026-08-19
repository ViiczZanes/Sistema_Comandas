import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const bodySchema = z.object({
  restaurantName: z.string().trim().min(2).max(60),
  adminName: z.string().trim().min(2).max(60),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

// Onboarding público — cria um restaurante novo (Restaurant + Settings,
// tudo desligado por padrão, mesmo default de quem já existe) + o primeiro
// usuário (sempre ADMIN) e já loga. É o caminho de autoatendimento pra
// "alcançar o mercado" (donos de outros restaurantes se cadastram sozinhos,
// sem precisar de ninguém criando a conta manualmente) — sem verificação de
// e-mail, captcha ou cobrança nesta rodada.
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const { restaurantName, adminName, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Já existe uma conta com esse e-mail." },
      { status: 409 }
    );
  }

  // O slug precisa ser único — tenta o nome puro primeiro, depois vai
  // sufixando "-2", "-3"... até achar um livre. Nomes bem curtos ou só com
  // caracteres especiais podem gerar um slug vazio; nesse caso cai num
  // prefixo genérico antes de sufixar.
  const base = slugify(restaurantName) || "restaurante";
  let slug = base;
  for (let n = 2; await prisma.restaurant.findUnique({ where: { slug } }); n++) {
    slug = `${base}-${n}`;
  }

  const passwordHash = await hashPassword(password);

  const { user } = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: { slug, settings: { create: { restaurantName } } },
    });
    const createdUser = await tx.user.create({
      data: {
        restaurantId: restaurant.id,
        name: adminName,
        email,
        passwordHash,
        role: "ADMIN",
      },
    });
    return { restaurant, user: createdUser };
  });

  await createSession(user.id);

  return NextResponse.json({ id: user.id, name: user.name, role: user.role }, { status: 201 });
}
