import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Criptografia simétrica pra credencial sensível em repouso no banco (hoje:
// o client secret da integração com o iFood — ver src/lib/ifood/). AES-256-GCM
// com a chave vinda só do ambiente (IFOOD_CREDENTIALS_KEY, 64 caracteres
// hex = 32 bytes), nunca do banco. Cada valor cifrado carrega seu próprio
// IV aleatório (nunca reaproveitado) e a tag de autenticação do GCM —
// os três ficam concatenados no mesmo texto guardado, separados por ":",
// pra não precisar de colunas extras.

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.IFOOD_CREDENTIALS_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "IFOOD_CREDENTIALS_KEY ausente ou com tamanho errado — precisa ser uma " +
        "chave hex de 64 caracteres (32 bytes). Gere uma com: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return Buffer.from(hex, "hex");
}

/** Cifra um texto (ex: client secret) — devolve `iv:tag:ciphertext`, tudo em hex. */
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12); // 96 bits é o recomendado pro GCM
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decifra um valor gerado por `encryptSecret`. Lança se a chave estiver
 * errada ou o valor tiver sido adulterado (tag de autenticação do GCM). */
export function decryptSecret(cipherText: string): string {
  const [ivHex, tagHex, dataHex] = cipherText.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Valor cifrado em formato inesperado.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
