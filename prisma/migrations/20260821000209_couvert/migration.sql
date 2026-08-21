-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_comandas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "currentTableId" TEXT,
    "couponId" TEXT,
    "couponCode" TEXT,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "couvertCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "comandas_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comandas_currentTableId_fkey" FOREIGN KEY ("currentTableId") REFERENCES "tables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "comandas_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_comandas" ("closedAt", "couponCode", "couponId", "currentTableId", "discountCents", "id", "number", "openedAt", "restaurantId", "status", "token") SELECT "closedAt", "couponCode", "couponId", "currentTableId", "discountCents", "id", "number", "openedAt", "restaurantId", "status", "token" FROM "comandas";
DROP TABLE "comandas";
ALTER TABLE "new_comandas" RENAME TO "comandas";
CREATE UNIQUE INDEX "comandas_token_key" ON "comandas"("token");
CREATE INDEX "comandas_restaurantId_idx" ON "comandas"("restaurantId");
CREATE UNIQUE INDEX "comandas_restaurantId_number_key" ON "comandas"("restaurantId", "number");
CREATE TABLE "new_settings" (
    "restaurantId" TEXT NOT NULL PRIMARY KEY,
    "restaurantName" TEXT NOT NULL DEFAULT 'Comandas',
    "logoUrl" TEXT,
    "brandColorHex" TEXT NOT NULL DEFAULT '#c1401f',
    "qrDotStyle" TEXT NOT NULL DEFAULT 'square',
    "qrLogoInCenter" BOOLEAN NOT NULL DEFAULT false,
    "serviceFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serviceFeePercent" INTEGER NOT NULL DEFAULT 10,
    "couvertEnabled" BOOLEAN NOT NULL DEFAULT false,
    "couvertCents" INTEGER NOT NULL DEFAULT 0,
    "kioskEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledPickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_settings" ("brandColorHex", "deliveryEnabled", "kioskEnabled", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantId", "restaurantName", "scheduledPickupEnabled", "serviceFeeEnabled", "serviceFeePercent", "updatedAt") SELECT "brandColorHex", "deliveryEnabled", "kioskEnabled", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantId", "restaurantName", "scheduledPickupEnabled", "serviceFeeEnabled", "serviceFeePercent", "updatedAt" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
