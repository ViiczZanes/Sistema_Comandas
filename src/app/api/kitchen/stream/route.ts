import { requireApiUser } from "@/lib/apiAuth";
import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

// Server-Sent Events: a cozinha assina esse endpoint e recebe um evento toda
// vez que um pedido é criado ou muda de status (seção 11 do documento —
// "o pedido deve aparecer na cozinha sem precisar atualizar a página").
export async function GET() {
  const { error } = await requireApiUser(["ADMIN", "KITCHEN"]);
  if (error) return error;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`));

      unsubscribe = subscribe("kitchen", (data) => {
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
