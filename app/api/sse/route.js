import { verifyAccessToken } from "@/lib/auth";
import { addSSEClient, removeSSEClient } from "@/lib/sse/sseClients";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  // Extract token and clientId from query params
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const clientId = searchParams.get("clientId");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify token
  const result = verifyAccessToken(token);
  if (!result.valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = result.userId;

  // Use provided clientId or generate one
  const effectiveClientId = clientId || `${userId}-${Date.now()}`;

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message with clientId confirmation
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            clientId: effectiveClientId,
          })}\n\n`
        )
      );

      // Register this client
      const sendMessage = data => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
          removeSSEClient(userId, effectiveClientId);
        }
      };

      addSSEClient(userId, effectiveClientId, sendMessage);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          removeSSEClient(userId, effectiveClientId);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeSSEClient(userId, effectiveClientId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
