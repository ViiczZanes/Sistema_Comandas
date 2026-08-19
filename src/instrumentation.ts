// Hook oficial do Next.js — roda uma única vez quando o servidor sobe
// (https://nextjs.org/docs/app/guides/instrumentation). É onde o poller do
// iFood é iniciado (ver src/lib/ifood/poller.ts): um único setInterval por
// processo, do mesmo jeito que o barramento de realtime em memória
// (src/lib/events.ts) também assume uma instância Node só.
//
// `register()` roda tanto no runtime nodejs quanto no edge — o poller usa
// Prisma e node:crypto, que só existem no nodejs, daí o guard abaixo.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startIfoodPoller } = await import("@/lib/ifood/poller");
    startIfoodPoller();
  }
}
