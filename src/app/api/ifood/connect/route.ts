import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/apiAuth";
import { requestIfoodUserCode, IfoodAuthError } from "@/lib/ifood/auth";

const bodySchema = z.object({
  clientId: z.string().trim().min(1, "Informe o Client ID."),
  clientSecret: z.string().trim().min(1, "Informe o Client Secret."),
});

// Passo 1 do fluxo de conexão (app "distribuído" — ver src/lib/ifood/auth.ts):
// gera o userCode que o dono da loja precisa digitar no Portal do
// Parceiro. Não grava nada no banco ainda — só depois que o passo 2
// (POST /api/ifood/authorize) confirmar a autorização de verdade.
export async function POST(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const result = await requestIfoodUserCode(
      user.restaurantId,
      parsed.data.clientId,
      parsed.data.clientSecret
    );
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof IfoodAuthError ? err.message : "Não foi possível gerar o código de autorização.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
