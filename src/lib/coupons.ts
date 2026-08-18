import "server-only";
import { prisma } from "@/lib/prisma";

export type CouponCheckResult =
  | { ok: true; couponId: string; code: string; discountCents: number }
  | { ok: false; error: string };

/** Valida um código de cupom contra um subtotal e devolve o desconto em
 * centavos — nunca confia num valor de desconto vindo do cliente, sempre
 * recalcula aqui a partir do cupom de verdade no banco. Não incrementa
 * `usedCount` (isso só acontece quando o pedido é confirmado de verdade —
 * ver /api/totem/checkout/[id]). */
export async function checkCoupon(
  rawCode: string,
  subtotalCents: number
): Promise<CouponCheckResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Digite um código de cupom." };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    return { ok: false, error: "Cupom inválido." };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, error: "Esse cupom expirou." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "Esse cupom já atingiu o limite de uso." };
  }

  const discountCents =
    coupon.type === "PERCENT"
      ? Math.round((subtotalCents * coupon.value) / 100)
      : Math.min(coupon.value, subtotalCents);

  return { ok: true, couponId: coupon.id, code: coupon.code, discountCents };
}
