-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_mercadopago_integrations" (
    "restaurantId" TEXT NOT NULL PRIMARY KEY,
    "accessTokenEnc" TEXT NOT NULL,
    "mpUserId" TEXT,
    "nickname" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastErrorAt" DATETIME,
    "lastErrorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mercadopago_integrations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_mercadopago_integrations" ("accessTokenEnc", "createdAt", "enabled", "lastErrorAt", "lastErrorMessage", "mpUserId", "nickname", "restaurantId", "updatedAt") SELECT "accessTokenEnc", "createdAt", "enabled", "lastErrorAt", "lastErrorMessage", "mpUserId", "nickname", "restaurantId", "updatedAt" FROM "mercadopago_integrations";
DROP TABLE "mercadopago_integrations";
ALTER TABLE "new_mercadopago_integrations" RENAME TO "mercadopago_integrations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
