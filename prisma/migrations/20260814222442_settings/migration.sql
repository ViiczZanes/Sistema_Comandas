-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "restaurantName" TEXT NOT NULL DEFAULT 'Comandas',
    "logoUrl" TEXT,
    "brandColorHex" TEXT NOT NULL DEFAULT '#c1401f',
    "qrDotStyle" TEXT NOT NULL DEFAULT 'square',
    "qrLogoInCenter" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
