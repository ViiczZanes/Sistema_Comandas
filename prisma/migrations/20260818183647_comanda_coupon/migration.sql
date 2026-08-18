-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_comandas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "currentTableId" TEXT,
    "couponId" TEXT,
    "couponCode" TEXT,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "comandas_currentTableId_fkey" FOREIGN KEY ("currentTableId") REFERENCES "tables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "comandas_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_comandas" ("closedAt", "currentTableId", "id", "number", "openedAt", "status", "token") SELECT "closedAt", "currentTableId", "id", "number", "openedAt", "status", "token" FROM "comandas";
DROP TABLE "comandas";
ALTER TABLE "new_comandas" RENAME TO "comandas";
CREATE UNIQUE INDEX "comandas_number_key" ON "comandas"("number");
CREATE UNIQUE INDEX "comandas_token_key" ON "comandas"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
