import "server-only";
import { createHash } from "node:crypto";

// O Catalog API v2 do iFood exige que id de categoria/item/opção seja um
// UUID v4 (formato), único por merchant — mas re-sincronizar sempre
// precisa bater no MESMO id de antes (senão duplica em vez de
// atualizar). Em vez de gerar e persistir um UUID aleatório por
// entidade (mais uma tabela de mapeamento pra manter consistente), o id
// enviado ao iFood é DERIVADO deterministicamente do id interno
// (`cuid`) via UUID v5 — mesma entrada sempre produz o mesmo UUID, sem
// guardar nada. `externalCode` (ver catalog.ts) leva o id interno cru,
// pra rastreio manual do lado do Portal do Parceiro.
//
// SHA-1(namespace + nome) com os bits de versão/variante ajustados por
// cima (mesma mecânica de um UUID v5 — RFC 4122), mas forçando o nibble
// de versão pra "4": a doc do iFood exige explicitamente "UUID v4" no
// formato dos ids, então o byte de versão é setado como 4 mesmo o
// algoritmo por trás sendo hash determinístico, não aleatório — o que
// importa aqui é a forma validada pelo iFood, não a proveniência
// "verdadeiramente aleatória" que a v4 normalmente implica. Implementado
// à mão com node:crypto, no mesmo espírito de src/lib/crypto.ts — não
// precisa de dependência nova só pra isso.

// Namespace fixo deste projeto — gerado uma vez
// (`node -e "console.log(require('crypto').randomUUID())"`) e nunca mais
// deve mudar: trocar isso re-deriva TODOS os ids e o iFood passaria a
// enxergar cada categoria/item como uma entidade nova, duplicando o
// catálogo em vez de atualizar o existente.
const NAMESPACE = "fbd0ea07-84fa-48af-b33f-ba15c1959c3d";

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** UUID v5 determinístico — mesma `name` sempre devolve o mesmo UUID.
 * `name` deve incluir um prefixo por tipo de entidade (ver funções
 * abaixo) pra "categoria X" e "item X" nunca colidirem mesmo se os ids
 * internos se parecerem. */
function uuidV5(name: string): string {
  const hash = createHash("sha1")
    .update(uuidToBytes(NAMESPACE))
    .update(name, "utf8")
    .digest();

  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // nibble de versão "4", exigido pelo iFood
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  return bytesToUuid(Buffer.from(bytes));
}

export function ifoodCategoryId(categoryId: string): string {
  return uuidV5(`category:${categoryId}`);
}

export function ifoodItemId(productId: string): string {
  return uuidV5(`item:${productId}`);
}

/** Grupo sintético de opções "Adicionais" (ADDITIONAL) ou "Remover"
 * (REMOVABLE) de um produto — ver comentário de mapeamento em
 * catalog.ts. Um produto tem no máximo um grupo de cada tipo. */
export function ifoodOptionGroupId(productId: string, kind: "additional" | "removable"): string {
  return uuidV5(`optionGroup:${kind}:${productId}`);
}

export function ifoodOptionId(productOptionId: string): string {
  return uuidV5(`option:${productOptionId}`);
}
