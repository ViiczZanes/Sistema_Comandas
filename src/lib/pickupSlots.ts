import "server-only";

// Horários fixos de retirada agendada — grade de 30 em 30 minutos, com uma
// folga mínima de 30min a partir de agora (dá tempo da cozinha preparar) e
// cobrindo as próximas ~3h. Fora do escopo desta rodada: horário de
// funcionamento configurável (ver plano) — por ora é sempre "próximas ~3h
// a partir de agora", em qualquer hora do dia.
const SLOT_INTERVAL_MIN = 30;
const BUFFER_MIN = 30;
const WINDOW_HOURS = 3;

/** Lista de horários (ISO) disponíveis pra retirada agendada, calculada a
 * partir de `now`. Usada tanto pra exibir a grade ao cliente quanto pra
 * revalidar no servidor o horário escolhido (nunca confia no que vem do
 * cliente sem checar contra esta mesma função). */
export function getPickupSlots(now: Date = new Date()): Date[] {
  const earliest = new Date(now.getTime() + BUFFER_MIN * 60_000);
  // Arredonda pra cima até o próximo múltiplo de 30min "redondo" (ex:
  // 14:07 + 30min de folga = 14:37 → primeiro slot é 15:00, não 14:37).
  const first = new Date(earliest);
  first.setSeconds(0, 0);
  const remainder = first.getMinutes() % SLOT_INTERVAL_MIN;
  if (remainder !== 0 || earliest.getSeconds() > 0) {
    first.setMinutes(first.getMinutes() + (SLOT_INTERVAL_MIN - remainder));
  }

  const last = new Date(now.getTime() + WINDOW_HOURS * 60 * 60_000);

  const slots: Date[] = [];
  for (let t = first; t <= last; t = new Date(t.getTime() + SLOT_INTERVAL_MIN * 60_000)) {
    slots.push(t);
  }
  return slots;
}

/** Confere se `candidate` bate (no minuto) com algum slot válido calculado
 * a partir de `now` — usado pra revalidar no servidor o horário que o
 * cliente escolheu, sem confiar no ISO cru que veio do body. */
export function isValidPickupSlot(candidate: Date, now: Date = new Date()): boolean {
  return getPickupSlots(now).some((slot) => slot.getTime() === candidate.getTime());
}
