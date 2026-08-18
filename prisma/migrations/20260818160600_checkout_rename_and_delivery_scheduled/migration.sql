-- AlterTable: pedidos ganham endereço de entrega / horário agendado
-- (denormalizados do Checkout na confirmação, só preenchidos para os
-- canais DELIVERY / SCHEDULED respectivamente).
ALTER TABLE "orders" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "orders" ADD COLUMN "scheduledFor" DATETIME;

-- Rename kiosk_checkouts -> checkouts (preserva os dados existentes — o
-- model deixou de ser exclusivo do totem e passa a ser reaproveitado por
-- delivery/agendado também, ver Checkout no schema.prisma).
ALTER TABLE "kiosk_checkouts" RENAME TO "checkouts";

-- Novas colunas do Checkout compartilhado. Linhas existentes eram todas do
-- totem, então o default 'KIOSK' já reflete corretamente o canal delas.
ALTER TABLE "checkouts" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'KIOSK';
ALTER TABLE "checkouts" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "checkouts" ADD COLUMN "scheduledFor" DATETIME;

-- Índice único de orderId segue a tabela renomeada.
DROP INDEX "kiosk_checkouts_orderId_key";
CREATE UNIQUE INDEX "checkouts_orderId_key" ON "checkouts"("orderId");

-- AlterTable: settings ganha os dois toggles novos (delivery/agendado),
-- mesmo padrão do kioskEnabled.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "restaurantName" TEXT NOT NULL DEFAULT 'Comandas',
    "logoUrl" TEXT,
    "brandColorHex" TEXT NOT NULL DEFAULT '#c1401f',
    "qrDotStyle" TEXT NOT NULL DEFAULT 'square',
    "qrLogoInCenter" BOOLEAN NOT NULL DEFAULT false,
    "serviceFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serviceFeePercent" INTEGER NOT NULL DEFAULT 10,
    "kioskEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledPickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_settings" ("brandColorHex", "id", "kioskEnabled", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "serviceFeeEnabled", "serviceFeePercent", "updatedAt") SELECT "brandColorHex", "id", "kioskEnabled", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "serviceFeeEnabled", "serviceFeePercent", "updatedAt" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
