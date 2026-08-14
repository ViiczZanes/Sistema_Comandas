// Helpers de intervalo de datas para o painel de vendas. Tudo em horário
// local do servidor — para um único restaurante isso é o suficiente (não
// precisamos de fuso por usuário).

export type RangePreset = "today" | "7d" | "30d" | "month";

export const RANGE_PRESET_LABEL: Record<RangePreset, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  month: "Este mês",
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** YYYY-MM-DD em horário local (não usar toISOString — vira UTC e desloca o dia). */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export type ResolvedRange = {
  from: Date;
  to: Date;
  preset: RangePreset | null; // null quando é um range customizado
};

export function resolveRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): ResolvedRange {
  if (params.from && params.to) {
    const from = parseDateInputValue(params.from);
    const to = parseDateInputValue(params.to);
    if (from && to && from <= to) {
      return { from: startOfDay(from), to: endOfDay(to), preset: null };
    }
  }

  const now = new Date();
  const preset: RangePreset =
    params.range === "today" ||
    params.range === "30d" ||
    params.range === "month"
      ? params.range
      : "7d";

  const to = endOfDay(now);
  let from: Date;
  switch (preset) {
    case "today":
      from = startOfDay(now);
      break;
    case "30d":
      from = startOfDay(addDays(now, -29));
      break;
    case "month":
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
    default:
      from = startOfDay(addDays(now, -6));
  }
  return { from, to, preset };
}

/** Lista de dias (00:00 local) entre from e to, inclusive — para preencher o
 * gráfico diário mesmo nos dias sem nenhuma venda. */
export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(from);
  const last = startOfDay(to);
  while (cursor <= last) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
