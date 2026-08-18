-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_kiosk_checkouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartJson" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'PIX',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerRef" TEXT,
    "couponId" TEXT,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "kiosk_checkouts_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "kiosk_checkouts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_kiosk_checkouts" ("amountCents", "cartJson", "createdAt", "id", "orderId", "provider", "providerRef", "status", "updatedAt") SELECT "amountCents", "cartJson", "createdAt", "id", "orderId", "provider", "providerRef", "status", "updatedAt" FROM "kiosk_checkouts";
DROP TABLE "kiosk_checkouts";
ALTER TABLE "new_kiosk_checkouts" RENAME TO "kiosk_checkouts";
CREATE UNIQUE INDEX "kiosk_checkouts_orderId_key" ON "kiosk_checkouts"("orderId");
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'DINE_IN',
    "tableId" TEXT,
    "comandaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("channel", "comandaId", "createdAt", "id", "note", "number", "status", "tableId", "totalCents", "updatedAt") SELECT "channel", "comandaId", "createdAt", "id", "note", "number", "status", "tableId", "totalCents", "updatedAt" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");
CREATE INDEX "orders_tableId_idx" ON "orders"("tableId");
CREATE INDEX "orders_comandaId_idx" ON "orders"("comandaId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
