-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comandaId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 0,
    "registeredById" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesComanda" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "payments_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amountCents", "closesComanda", "comandaId", "id", "method", "paidAt", "registeredById") SELECT "amountCents", "closesComanda", "comandaId", "id", "method", "paidAt", "registeredById" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE INDEX "payments_comandaId_idx" ON "payments"("comandaId");
CREATE TABLE "new_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "restaurantName" TEXT NOT NULL DEFAULT 'Comandas',
    "logoUrl" TEXT,
    "brandColorHex" TEXT NOT NULL DEFAULT '#c1401f',
    "qrDotStyle" TEXT NOT NULL DEFAULT 'square',
    "qrLogoInCenter" BOOLEAN NOT NULL DEFAULT false,
    "serviceFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serviceFeePercent" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_settings" ("brandColorHex", "id", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "updatedAt") SELECT "brandColorHex", "id", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "updatedAt" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
