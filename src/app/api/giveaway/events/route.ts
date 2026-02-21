import { giveawayState } from "@/lib/giveaway-state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      giveawayState.registerClient(controller);

      // Send initial state as a connected event
      const initialData = JSON.stringify(giveawayState.getStatus());
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${initialData}\n\n`)
      );

      // Send keepalive every 15 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 15_000);

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        giveawayState.removeClient(controller);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // Stream cancelled by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
