import { formatCents } from "@/lib/money";

// Gráfico de faturamento por dia — série única, então a cor não carrega
// identidade (é só uma métrica), por isso um único hue (a cor da marca) em
// vez de paleta categórica. Renderizado como SVG estático no servidor: sem
// JS no cliente, com tooltip nativo (<title>) em cada barra como camada
// mínima de hover/acessibilidade.
export function RevenueBarChart({
  data,
}: {
  data: { label: string; cents: number }[];
}) {
  const width = 640;
  const height = 220;
  const marginLeft = 56;
  const marginRight = 8;
  const marginTop = 20;
  const marginBottom = 28;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const maxCents = Math.max(...data.map((d) => d.cents), 1);
  const niceMax = niceCeiling(maxCents);

  const bandWidth = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.max(2, Math.min(24, bandWidth - 4));

  const peakIndex = data.reduce(
    (best, d, i) => (d.cents > data[best].cents ? i : best),
    0
  );

  // Mostra um rótulo de eixo X a cada N barras pra não empilhar texto.
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  const gridLines = [0, 0.5, 1].map((f) => ({
    value: niceMax * f,
    y: marginTop + plotHeight * (1 - f),
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Faturamento por dia"
    >
      {gridLines.map((g) => (
        <g key={g.value}>
          <line
            x1={marginLeft}
            x2={width - marginRight}
            y1={g.y}
            y2={g.y}
            stroke="#e1e0d9"
            strokeWidth={1}
          />
          <text
            x={marginLeft - 8}
            y={g.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="#898781"
          >
            {formatCompact(g.value)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = marginLeft + i * bandWidth + (bandWidth - barWidth) / 2;
        const barHeight = niceMax > 0 ? (d.cents / niceMax) * plotHeight : 0;
        const y = marginTop + plotHeight - barHeight;
        const isPeak = i === peakIndex && d.cents > 0;

        return (
          <g key={i}>
            <rect
              x={x}
              y={barHeight > 0 ? y : marginTop + plotHeight - 1}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              rx={4}
              className="fill-brand-600"
              aria-label={`${d.label}: ${formatCents(d.cents)}`}
            />
            {isPeak && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#0b0b0b"
              >
                {formatCompact(d.cents)}
              </text>
            )}
            {i % labelStep === 0 && (
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize={10}
                fill="#898781"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}

      <line
        x1={marginLeft}
        x2={width - marginRight}
        y1={marginTop + plotHeight}
        y2={marginTop + plotHeight}
        stroke="#c3c2b7"
        strokeWidth={1}
      />
    </svg>
  );
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatCompact(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1000) {
    return `R$ ${(reais / 1000).toFixed(reais >= 10000 ? 0 : 1)}K`;
  }
  return `R$ ${reais.toFixed(0)}`;
}
