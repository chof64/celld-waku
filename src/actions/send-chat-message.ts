"use server";

import { chatMessageSchema, roomIdSchema, roomPath, sendMessageSchema } from "../features/chat/contracts";
import { proxyChatRequest } from "../features/chat/backend.server";

export async function sendChatMessage(input: {
  roomId: string;
  userName: string;
  text: string;
}) {
  const roomId = roomIdSchema.parse(input.roomId);
  const message = sendMessageSchema.parse(input);

  const response = await proxyChatRequest(roomPath(roomId, "/messages"), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error("Could not send your message. Check the chat connection and try again.");
  }

  return chatMessageSchema.parse(await response.json());
}
