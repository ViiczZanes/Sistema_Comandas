import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Configurações do restaurante, numa linha única. `cache()` do React
// deduplica chamadas repetidas dentro da mesma requisição — várias telas
// chamam getSettings() de forma independente (layouts, páginas do cliente)
// sem se preocupar em passar isso por props/context, e ainda assim só bate
// no banco uma vez por request.
export const getSettings = cache(async () => {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return settings;
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;
