import { formatCents } from "@/lib/money";

export type RankedBarRow = {
  key: string;
  label: string;
  valueCents: number;
  meta?: string;
  color?: string; // omitido = usa a cor de marca (magnitude, série única)
};

// Lista de barras horizontais — usada tanto para "magnitude" (produtos mais
// vendidos: um hue só, a ordem/tamanho é que carrega o sentido) quanto para
// "identidade categórica" (formas de pagamento: cor fixa por categoria,
// vinda da paleta categórica validada). Rótulo direto em toda linha porque
// aqui a lista inteira já É a tabela — não é uma série densa onde rotular
// tudo vira ruído.
export function RankedBars({ rows }: { rows: RankedBarRow[] }) {
  const max = Math.max(...rows.map((r) => r.valueCents), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-medium text-stone-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: row.color ?? "var(--color-brand-600)" }}
              />
              <span className="truncate">{row.label}</span>
              {row.meta && (
                <span className="shrink-0 text-xs text-stone-400">{row.meta}</span>
              )}
            </span>
            <span className="shrink-0 font-semibold text-stone-900">
              {formatCents(row.valueCents)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full transition-[width]"
              style={{
                width: `${Math.max((row.valueCents / max) * 100, row.valueCents > 0 ? 2 : 0)}%`,
                background: row.color ?? "var(--color-brand-600)",
              }}
            />
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="text-sm text-stone-400">Sem dados no período.</p>
      )}
    </div>
  );
}
