// Deriva a escala inteira de marca (brand-50 … brand-950) a partir de UMA
// cor escolhida pelo cliente em Configurações. Em vez de deixar a pessoa
// escolher 11 tons à mão (impossível de acertar sem know-how de design), a
// gente só pega o MATIZ (hue) da cor escolhida e gira a mesma escala
// desenhada à mão pra esse matiz — luminosidade e croma (contraste e
// "peso" da cor) continuam idênticos ao padrão em qualquer cor escolhida,
// só a cor em si muda. Mesma técnica de src/app/globals.css, só que
// parametrizada.

// oklch(L C H) de cada degrau, com o matiz original em H=30 (brand-600 —
// o vermelho-tangerina padrão do sistema). Ver globals.css.
const BASE_STEPS: { step: number; l: number; c: number; h: number }[] = [
  { step: 50, l: 0.97, c: 0.018, h: 44 },
  { step: 100, l: 0.94, c: 0.045, h: 42 },
  { step: 200, l: 0.88, c: 0.085, h: 40 },
  { step: 300, l: 0.8, c: 0.13, h: 38 },
  { step: 400, l: 0.71, c: 0.18, h: 36 },
  { step: 500, l: 0.635, c: 0.205, h: 33 },
  { step: 600, l: 0.565, c: 0.19, h: 30 },
  { step: 700, l: 0.485, c: 0.17, h: 28 },
  { step: 800, l: 0.405, c: 0.14, h: 26 },
  { step: 900, l: 0.335, c: 0.11, h: 24 },
  { step: 950, l: 0.22, c: 0.075, h: 22 },
];
const BASE_HUE = 30; // matiz de referência (brand-600) usado pro offset

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Extrai só o matiz (0–360) de uma cor hex, via conversão OKLab. */
export function hexToHue(hex: string): number | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  const r = srgbToLinear(((int >> 16) & 255) / 255);
  const g = srgbToLinear(((int >> 8) & 255) / 255);
  const b = srgbToLinear((int & 255) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // croma perto de zero (cinza) não tem matiz definido de forma estável —
  // não é um caso útil pra cor de marca, então tratamos como inválido.
  if (Math.sqrt(a * a + bb * bb) < 0.005) return null;

  let hue = (Math.atan2(bb, a) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  return hue;
}

function rotatedSteps(hex: string) {
  const hue = hexToHue(hex);
  const offset = hue === null ? 0 : hue - BASE_HUE;
  return BASE_STEPS.map(({ step, l, c, h }) => ({
    step,
    oklch: `oklch(${l} ${c} ${(((h + offset) % 360) + 360) % 360})`,
  }));
}

/** Gera as variáveis CSS da escala de marca (--color-brand-50 … 950)
 * giradas pro matiz da cor escolhida, prontas pra injetar num <style>. */
export function brandScaleCss(hex: string): string {
  const lines = rotatedSteps(hex).map(
    ({ step, oklch }) => `  --color-brand-${step}: ${oklch};`
  );
  return `:root {\n${lines.join("\n")}\n}`;
}

/** Mesma escala, como lista de {step, color} — pra desenhar um preview de
 * swatches na tela de Configurações (função pura, sem `server-only`: pode
 * ser importada tanto no servidor quanto num Client Component). */
export function deriveBrandSteps(hex: string): { step: number; color: string }[] {
  return rotatedSteps(hex).map(({ step, oklch }) => ({ step, color: oklch }));
}
