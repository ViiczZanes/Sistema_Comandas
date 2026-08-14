import QRCode from "qrcode";

// Gera a URL pública que fica codificada dentro do QR Code. Em produção
// defina NEXT_PUBLIC_BASE_URL (ex: https://pdv.seurestaurante.com); em
// desenvolvimento cai para localhost.
function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export function tableUrl(qrToken: string): string {
  return `${baseUrl()}/m/${qrToken}`;
}

export function comandaUrl(token: string): string {
  return `${baseUrl()}/c/${token}`;
}

export async function qrCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
}
