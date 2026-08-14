import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@/generated/prisma/client";

// Autenticação própria (sessão em cookie httpOnly + tabela Session no
// banco), em vez de uma lib de terceiros: o app é pequeno (só staff faz
// login — cliente nunca precisa de conta, ele usa o token da mesa/comanda),
// então um esquema simples e auditável é suficiente e evita depender de uma
// versão beta de auth junto com uma versão muito nova do Next.

const SESSION_COOKIE = "pdv_session";
const SESSION_TTL_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {
      // sessão já não existe, tudo bem
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  if (!session.user.active) return null;

  return session.user;
}

/** Garante que existe um usuário logado com um dos papéis permitidos.
 * Lança um erro com `redirectTo` para quem chamar decidir como reagir —
 * nas páginas usamos `requireUser` diretamente, que já faz o redirect. */
export async function getUserOrNull(roles?: Role[]): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

/** Para usar em Server Components de páginas/layouts protegidos: redireciona
 * para o login se não houver sessão, ou para "/" se o papel não tiver
 * permissão para aquela área. */
export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (roles && !roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}
