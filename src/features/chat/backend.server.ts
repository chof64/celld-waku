import { env } from "cloudflare:workers";

import { historySchema, roomPath, type ChatMessage } from "./contracts";
import { chatGatewayError, fetchChatBackend } from "./gateway";

export interface ChatHistory {
  messages: ChatMessage[];
  available: boolean;
}

export async function loadChatHistory(roomId: string): Promise<ChatHistory> {
  try {
    const response = await fetchChatBackend(env, roomPath(roomId, "/messages"), {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return { messages: [], available: false };

    const parsed = historySchema.safeParse(await response.json());
    if (!parsed.success) return { messages: [], available: false };

    return { messages: parsed.data.messages, available: true };
  } catch (error) {
    console.error("Chat SSR history could not be loaded", error);
    return { messages: [], available: false };
  }
}

export async function proxyChatRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    return await fetchChatBackend(env, path, init);
  } catch (error) {
    return chatGatewayError(error);
  }
}
