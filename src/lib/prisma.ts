import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Prisma 7 exige um "driver adapter" explícito para o PrismaClient em tempo
// de execução (a CLI de migrations continua usando DATABASE_URL direto via
// prisma.config.ts, sem precisar de adapter).
//
// Hoje: SQLite local via libSQL (não exige compilar módulo nativo, funciona
// em qualquer SO sem build tools instalados).
//
// Migrando para PostgreSQL: troque este arquivo para usar
// `@prisma/adapter-pg` (ver README > "Migrando para PostgreSQL"). O resto do
// código da aplicação (todas as chamadas `prisma.*`) não muda nada.
function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

declare global {
  var __prisma: PrismaClient | undefined;
}

// Evita recriar o client (e reabrir conexões) a cada hot-reload em dev.
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
