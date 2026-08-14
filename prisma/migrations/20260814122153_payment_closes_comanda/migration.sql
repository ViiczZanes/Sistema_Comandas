-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comandaId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "registeredById" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesComanda" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "payments_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amountCents", "comandaId", "id", "method", "paidAt", "registeredById") SELECT "amountCents", "comandaId", "id", "method", "paidAt", "registeredById" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE INDEX "payments_comandaId_idx" ON "payments"("comandaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
