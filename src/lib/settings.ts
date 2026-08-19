import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Configurações de UM restaurante (multi-tenant — cada Restaurant tem sua
// própria linha em Settings, chaveada por restaurantId). `cache()` do
// React deduplica chamadas repetidas com o MESMO restaurantId dentro da
// mesma requisição — várias telas chamam getSettings(restaurantId) de
// forma independente (layouts, páginas do cliente) sem se preocupar em
// passar isso por props/context, e ainda assim só bate no banco uma vez
// por request por restaurante.
export const getSettings = cache(async (restaurantId: string) => {
  const settings = await prisma.settings.upsert({
    where: { restaurantId },
    update: {},
    create: { restaurantId },
  });
  return settings;
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;
