import type { ApiContext } from "waku/router";

import { proxyChatRequest } from "../../../../../features/chat/backend.server";
import { roomIdSchema, roomPath } from "../../../../../features/chat/contracts";

export async function GET(
  request: Request,
  { params }: ApiContext<"/api/rooms/[roomId]/socket">,
): Promise<Response> {
  const room = roomIdSchema.safeParse(params.roomId);
  if (!room.success) {
    return Response.json({ error: "Invalid room ID" }, { status: 400 });
  }

  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected a WebSocket upgrade", { status: 426 });
  }

  return proxyChatRequest(roomPath(room.data, "/socket"), {
    headers: { upgrade: "websocket" },
  });
}
