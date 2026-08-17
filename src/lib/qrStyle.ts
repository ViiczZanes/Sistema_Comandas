// Opções de estilo do QR Code compartilhadas entre a página de
// Configurações (preview ao vivo) e as páginas de impressão.

export type QrDotStyle = "square" | "dots" | "rounded" | "classy";

export const QR_DOT_STYLE_LABEL: Record<QrDotStyle, string> = {
  square: "Quadrado clássico",
  dots: "Pontos",
  rounded: "Arredondado",
  classy: "Elegante",
};

export const QR_DOT_STYLES: QrDotStyle[] = ["square", "dots", "rounded", "classy"];

export function isQrDotStyle(value: string): value is QrDotStyle {
  return (QR_DOT_STYLES as string[]).includes(value);
}

export type QrStyleOptions = {
  color: string;
  dotStyle: QrDotStyle;
  logoUrl?: string | null;
  useLogo: boolean;
};

/** Monta as opções pro construtor de QRCodeStyling a partir da configuração
 * do restaurante. Mantido separado do componente que renderiza porque
 * `qr-code-styling` só roda no navegador (usa canvas) — este arquivo é só
 * dados, sem import da lib, então pode ser importado em qualquer lugar. */
export function buildQrCodeOptions(
  text: string,
  { color, dotStyle, logoUrl, useLogo }: QrStyleOptions,
  size = 280
) {
  const cornerType =
    dotStyle === "square" ? "square" : dotStyle === "dots" ? "dot" : "extra-rounded";

  return {
    width: size,
    height: size,
    type: "canvas" as const,
    data: text,
    margin: 8,
    qrOptions: { errorCorrectionLevel: (useLogo && logoUrl ? "H" : "M") as "H" | "M" },
    dotsOptions: { color, type: dotStyle },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { color, type: cornerType as "square" | "dot" | "extra-rounded" },
    cornersDotOptions: { color, type: cornerType as "square" | "dot" | "extra-rounded" },
    image: useLogo && logoUrl ? logoUrl : undefined,
    imageOptions: { crossOrigin: "anonymous" as const, margin: 6, imageSize: 0.35 },
  };
}
