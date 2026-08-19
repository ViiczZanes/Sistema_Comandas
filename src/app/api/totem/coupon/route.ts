import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCoupon } from "@/lib/coupons";

const bodySchema = z.object({
  code: z.string().min(1),
  subtotalCents: z.number().int().positive(),
  restaurantId: z.string().min(1),
});

// Cliente digita o cupom no carrinho do totem (ou de /pedir, que reaproveita
// esta mesma rota — validação de cupom não depende de canal) antes de
// pagar — só valida e devolve o desconto pra pré-visualização. A validação
// de verdade (que conta pro pagamento) acontece de novo em
// POST /api/totem/checkout ou /api/pedir/checkout, sem confiar no que essa
// rota devolveu.
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const result = await checkCoupon(
    parsed.data.code,
    parsed.data.subtotalCents,
    parsed.data.restaurantId
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    code: result.code,
    discountCents: result.discountCents,
  });
}
