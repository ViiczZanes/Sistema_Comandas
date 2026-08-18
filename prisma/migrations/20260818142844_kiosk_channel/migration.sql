-- CreateTable
CREATE TABLE "kiosk_checkouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartJson" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerRef" TEXT,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "kiosk_checkouts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'DINE_IN',
    "tableId" TEXT,
    "comandaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("comandaId", "createdAt", "id", "note", "number", "status", "tableId", "totalCents", "updatedAt") SELECT "comandaId", "createdAt", "id", "note", "number", "status", "tableId", "totalCents", "updatedAt" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");
CREATE INDEX "orders_tableId_idx" ON "orders"("tableId");
CREATE INDEX "orders_comandaId_idx" ON "orders"("comandaId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comandaId" TEXT,
    "orderId" TEXT,
    "method" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 0,
    "registeredById" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesComanda" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "payments_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amountCents", "closesComanda", "comandaId", "id", "method", "paidAt", "registeredById", "serviceFeeCents") SELECT "amountCents", "closesComanda", "comandaId", "id", "method", "paidAt", "registeredById", "serviceFeeCents" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE INDEX "payments_comandaId_idx" ON "payments"("comandaId");
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_settings" ("brandColorHex", "id", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "serviceFeeEnabled", "serviceFeePercent", "updatedAt") SELECT "brandColorHex", "id", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "serviceFeeEnabled", "serviceFeePercent", "updatedAt" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_checkouts_orderId_key" ON "kiosk_checkouts"("orderId");
