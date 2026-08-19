
-- Multi-tenant: introduz o model Restaurant e escopa por restaurantId
-- toda tabela de dados do restaurante (mesas, comandas, cardápio,
-- pedidos, pagamentos, chamados de ajuda, log de auditoria, cupons,
-- checkouts). Gerado a partir do diff bruto do Prisma (que já usa
-- RedefineTables corretamente pra preservar cada coluna existente), com
-- dois ajustes manuais: (1) cria e popula um único restaurante
--'rst_default' representando o restaurante real já em produção, (2)
-- inclui "restaurantId" com o literal 'rst_default' em todo INSERT...
-- SELECT de backfill (o Prisma não sabe gerar esse valor sozinho,
-- deixava a coluna de fora do INSERT, o que quebraria a constraint
-- NOT NULL). `User.email`/`RestaurantTable.qrToken`/`Comanda.token`
-- continuam únicos globalmente, de propósito — ver decisões no plano.
-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- O restaurante real ja em producao, dono de todo dado existente ate aqui.
INSERT INTO "restaurants" ("id", "slug", "createdAt") VALUES ('rst_default', 'principal', CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("restaurantId", "action", "createdAt", "detail", "entityId", "entityType", "id", "summary", "userId") SELECT 'rst_default', "action", "createdAt", "detail", "entityId", "entityType", "id", "summary", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_restaurantId_idx" ON "audit_logs"("restaurantId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("restaurantId", "active", "createdAt", "id", "name", "sortOrder", "updatedAt") SELECT 'rst_default', "active", "createdAt", "id", "name", "sortOrder", "updatedAt" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE INDEX "categories_restaurantId_idx" ON "categories"("restaurantId");
CREATE TABLE "new_checkouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "cartJson" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'PIX',
    "channel" TEXT NOT NULL DEFAULT 'KIOSK',
    "deliveryAddress" TEXT,
    "scheduledFor" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerRef" TEXT,
    "couponId" TEXT,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "checkouts_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "checkouts_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "checkouts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_checkouts" ("restaurantId", "amountCents", "cartJson", "channel", "couponId", "createdAt", "deliveryAddress", "discountCents", "id", "method", "orderId", "provider", "providerRef", "scheduledFor", "status", "subtotalCents", "updatedAt") SELECT 'rst_default', "amountCents", "cartJson", "channel", "couponId", "createdAt", "deliveryAddress", "discountCents", "id", "method", "orderId", "provider", "providerRef", "scheduledFor", "status", "subtotalCents", "updatedAt" FROM "checkouts";
DROP TABLE "checkouts";
ALTER TABLE "new_checkouts" RENAME TO "checkouts";
CREATE UNIQUE INDEX "checkouts_orderId_key" ON "checkouts"("orderId");
CREATE INDEX "checkouts_restaurantId_idx" ON "checkouts"("restaurantId");
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
    CONSTRAINT "comandas_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comandas_currentTableId_fkey" FOREIGN KEY ("currentTableId") REFERENCES "tables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "comandas_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_comandas" ("restaurantId", "closedAt", "couponCode", "couponId", "currentTableId", "discountCents", "id", "number", "openedAt", "status", "token") SELECT 'rst_default', "closedAt", "couponCode", "couponId", "currentTableId", "discountCents", "id", "number", "openedAt", "status", "token" FROM "comandas";
DROP TABLE "comandas";
ALTER TABLE "new_comandas" RENAME TO "comandas";
CREATE UNIQUE INDEX "comandas_token_key" ON "comandas"("token");
CREATE INDEX "comandas_restaurantId_idx" ON "comandas"("restaurantId");
CREATE UNIQUE INDEX "comandas_restaurantId_number_key" ON "comandas"("restaurantId", "number");
CREATE TABLE "new_coupons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coupons_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_coupons" ("restaurantId", "active", "code", "createdAt", "expiresAt", "id", "maxUses", "type", "updatedAt", "usedCount", "value") SELECT 'rst_default', "active", "code", "createdAt", "expiresAt", "id", "maxUses", "type", "updatedAt", "usedCount", "value" FROM "coupons";
DROP TABLE "coupons";
ALTER TABLE "new_coupons" RENAME TO "coupons";
CREATE INDEX "coupons_restaurantId_idx" ON "coupons"("restaurantId");
CREATE UNIQUE INDEX "coupons_restaurantId_code_key" ON "coupons"("restaurantId", "code");
CREATE TABLE "new_help_calls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "help_calls_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "help_calls_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "help_calls_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_help_calls" ("restaurantId", "comandaId", "createdAt", "id", "resolvedAt", "tableId") SELECT 'rst_default', "comandaId", "createdAt", "id", "resolvedAt", "tableId" FROM "help_calls";
DROP TABLE "help_calls";
ALTER TABLE "new_help_calls" RENAME TO "help_calls";
CREATE INDEX "help_calls_restaurantId_idx" ON "help_calls"("restaurantId");
CREATE INDEX "help_calls_resolvedAt_idx" ON "help_calls"("resolvedAt");
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'DINE_IN',
    "tableId" TEXT,
    "comandaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "deliveryAddress" TEXT,
    "scheduledFor" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("restaurantId", "channel", "comandaId", "couponCode", "createdAt", "deliveryAddress", "discountCents", "id", "note", "number", "scheduledFor", "status", "tableId", "totalCents", "updatedAt") SELECT 'rst_default', "channel", "comandaId", "couponCode", "createdAt", "deliveryAddress", "discountCents", "id", "note", "number", "scheduledFor", "status", "tableId", "totalCents", "updatedAt" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE INDEX "orders_restaurantId_idx" ON "orders"("restaurantId");
CREATE INDEX "orders_tableId_idx" ON "orders"("tableId");
CREATE INDEX "orders_comandaId_idx" ON "orders"("comandaId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE UNIQUE INDEX "orders_restaurantId_number_key" ON "orders"("restaurantId", "number");
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "comandaId" TEXT,
    "orderId" TEXT,
    "method" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 0,
    "registeredById" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesComanda" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "payments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("restaurantId", "amountCents", "closesComanda", "comandaId", "id", "method", "orderId", "paidAt", "registeredById", "serviceFeeCents") SELECT 'rst_default', "amountCents", "closesComanda", "comandaId", "id", "method", "orderId", "paidAt", "registeredById", "serviceFeeCents" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE INDEX "payments_restaurantId_idx" ON "payments"("restaurantId");
CREATE INDEX "payments_comandaId_idx" ON "payments"("comandaId");
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "soldOut" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_products" ("restaurantId", "active", "categoryId", "createdAt", "description", "id", "image", "name", "priceCents", "soldOut", "sortOrder", "updatedAt") SELECT 'rst_default', "active", "categoryId", "createdAt", "description", "id", "image", "name", "priceCents", "soldOut", "sortOrder", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_restaurantId_idx" ON "products"("restaurantId");
CREATE TABLE "new_settings" (
    "restaurantId" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_settings" ("restaurantId", "brandColorHex", "deliveryEnabled", "kioskEnabled", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "scheduledPickupEnabled", "serviceFeeEnabled", "serviceFeePercent", "updatedAt") SELECT 'rst_default', "brandColorHex", "deliveryEnabled", "kioskEnabled", "logoUrl", "qrDotStyle", "qrLogoInCenter", "restaurantName", "scheduledPickupEnabled", "serviceFeeEnabled", "serviceFeePercent", "updatedAt" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE TABLE "new_tables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "qrToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tables" ("restaurantId", "createdAt", "id", "number", "qrToken", "status", "updatedAt") SELECT 'rst_default', "createdAt", "id", "number", "qrToken", "status", "updatedAt" FROM "tables";
DROP TABLE "tables";
ALTER TABLE "new_tables" RENAME TO "tables";
CREATE UNIQUE INDEX "tables_qrToken_key" ON "tables"("qrToken");
CREATE INDEX "tables_restaurantId_idx" ON "tables"("restaurantId");
CREATE UNIQUE INDEX "tables_restaurantId_number_key" ON "tables"("restaurantId", "number");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("restaurantId", "active", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt") SELECT 'rst_default', "active", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_restaurantId_idx" ON "users"("restaurantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

