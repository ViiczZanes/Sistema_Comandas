import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { Role, User } from "@/generated/prisma/client";

type ApiAuthResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse };

/** Helper para usar no topo de Route Handlers protegidos:
 *
 * const { user, error } = await requireApiUser(["ADMIN"]);
 * if (error) return error;
 */
export async function requireApiUser(roles?: Role[]): Promise<ApiAuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }),
    };
  }
  if (roles && !roles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Sem permissão." }, { status: 403 }),
    };
  }
  return { user, error: null };
}
