-- AlterTable
ALTER TABLE "ifood_integrations" ADD COLUMN "lastCatalogSyncAt" DATETIME;
ALTER TABLE "ifood_integrations" ADD COLUMN "lastCatalogSyncError" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "ifoodImagePath" TEXT;
ALTER TABLE "products" ADD COLUMN "ifoodImageSourceUrl" TEXT;
