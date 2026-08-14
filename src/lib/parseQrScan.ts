// Extrai o token da comanda a partir do texto lido pela câmera. Separado de
// lib/qrcode.ts (que importa o pacote `qrcode`, só usado no servidor) pra
// esse arquivo poder ser importado com segurança de um Client Component.
//
// O QR Code físico da comanda codifica uma URL completa
// (ex: "https://seurestaurante.com/c/7f82a91c..."), mas aceitamos também o
// token sozinho — caso alguém gere um QR mais simples.
export function extractComandaToken(scannedText: string): string | null {
  const text = scannedText.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const segments = url.pathname.split("/").filter(Boolean);
    const cIndex = segments.indexOf("c");
    if (cIndex !== -1 && segments[cIndex + 1]) {
      return segments[cIndex + 1];
    }
    return null; // é uma URL válida, mas não aponta pra uma comanda
  } catch {
    // Não é uma URL — trata como o token puro, se parecer plausível.
    return /^[a-zA-Z0-9_-]+$/.test(text) ? text : null;
  }
}
