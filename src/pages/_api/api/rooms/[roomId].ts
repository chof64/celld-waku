import type { ApiContext } from "waku/router";

import { proxyChatRequest } from "../../../../features/chat/backend.server";
import { roomIdSchema, roomPath } from "../../../../features/chat/contracts";

export async function GET(
  _request: Request,
  { params }: ApiContext<"/api/rooms/[roomId]">,
): Promise<Response> {
  const room = roomIdSchema.safeParse(params.roomId);
  if (!room.success) {
    return Response.json({ error: "Invalid room ID" }, { status: 400 });
  }

  return proxyChatRequest(roomPath(room.data), {
    headers: { accept: "application/json" },
  });
}
