import type { ApiContext } from "waku/router";

import { proxyChatRequest } from "../../../../../features/chat/backend.server";
import {
  roomIdSchema,
  roomPath,
  sendMessageSchema,
} from "../../../../../features/chat/contracts";

type Context = ApiContext<"/api/rooms/[roomId]/messages">;

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const room = roomIdSchema.safeParse(params.roomId);
  if (!room.success) {
    return Response.json({ error: "Invalid room ID" }, { status: 400 });
  }

  return proxyChatRequest(roomPath(room.data, "/messages"), {
    headers: { accept: "application/json" },
  });
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
  const room = roomIdSchema.safeParse(params.roomId);
  if (!room.success) {
    return Response.json({ error: "Invalid room ID" }, { status: 400 });
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const input = sendMessageSchema.safeParse(rawBody);
  if (!input.success) {
    return Response.json(
      { error: "Enter a name (max 40 characters) and a message (max 2,000 characters)." },
      { status: 400 },
    );
  }

  return proxyChatRequest(roomPath(room.data, "/messages"), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input.data),
  });
}
