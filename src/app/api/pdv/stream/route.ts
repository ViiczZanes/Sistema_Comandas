import { requireApiUser } from "@/lib/apiAuth";
import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

// Mesmo mecanismo do /api/kitchen/stream, para o painel do PDV (grade de
// mesas e comandas) reagir em tempo real a pedidos novos, comandas fechadas,
// transferidas, etc.
export async function GET() {
  const { error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`));

      unsubscribe = subscribe("pdv", (data) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
