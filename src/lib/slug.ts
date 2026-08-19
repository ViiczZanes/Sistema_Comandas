// Slug do restaurante — usado nas URLs públicas sem QR Code (/totem/[slug],
// /pedir/[slug]). Gerado a partir do nome no cadastro (ver /signup);
// minúsculo, sem acento, só letras/números/hífen.
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos (marcas combinantes após NFD)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
