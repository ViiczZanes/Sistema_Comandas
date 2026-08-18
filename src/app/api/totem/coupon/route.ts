import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCoupon } from "@/lib/coupons";

const bodySchema = z.object({
  code: z.string().min(1),
  subtotalCents: z.number().int().positive(),
});

// Cliente digita o cupom no carrinho do totem, antes de pagar — só valida
// e devolve o desconto pra pré-visualização. A validação de verdade (que
// conta pro pagamento) acontece de novo em POST /api/totem/checkout, sem
// confiar no que essa rota devolveu.
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const result = await checkCoupon(parsed.data.code, parsed.data.subtotalCents);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    code: result.code,
    discountCents: result.discountCents,
  });
}
