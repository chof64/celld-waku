import { describe, expect, it } from "vitest";

import {
  chatMessageSchema,
  historySchema,
  mergeMessages,
  roomIdSchema,
  roomPath,
  sendMessageSchema,
  socketEventSchema,
  type ChatMessage,
} from "../src/features/chat/contracts";
import { ChatBackendUnavailable, fetchChatBackend } from "../src/features/chat/gateway";

const message: ChatMessage = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  userName: "Ada",
  text: "Hello!",
  sentAt: 1_700_000_000_000,
};

describe("chat contract", () => {
  it("matches the Hono chat event and history shapes", () => {
    expect(chatMessageSchema.parse(message)).toEqual(message);
    expect(historySchema.parse({ messages: [message] })).toEqual({ messages: [message] });
    expect(socketEventSchema.parse({ type: "message", message }).message).toEqual(message);
  });

  it("validates room IDs and trims outgoing messages", () => {
    expect(roomIdSchema.safeParse("lobby").success).toBe(true);
    expect(roomIdSchema.safeParse("../../private").success).toBe(false);
    expect(roomIdSchema.safeParse("a".repeat(129)).success).toBe(false);
    expect(sendMessageSchema.parse({ userName: " Ada ", text: " hello " })).toEqual({
      userName: "Ada",
      text: "hello",
    });
    expect(sendMessageSchema.safeParse({ userName: "Ada", text: "" }).success).toBe(false);
  });

  it("deduplicates WebSocket events and POST responses and retains recent history", () => {
    const newer = { ...message, id: "second", sentAt: message.sentAt + 1000 };
    expect(mergeMessages([message], [newer, message])).toEqual([message, newer]);

    const longHistory = Array.from({ length: 125 }, (_, index) => ({
      ...message,
      id: String(index),
      sentAt: index,
    }));
    expect(mergeMessages([], longHistory)).toHaveLength(100);
    expect(mergeMessages([], longHistory)[0].sentAt).toBe(25);
  });
});

describe("chat gateway", () => {
  it("prefers the configured Celld service binding over network egress", async () => {
    const requests: Request[] = [];
    const response = await fetchChatBackend(
      {
        CHAT_SERVICE: {
          fetch: async (request) => {
            requests.push(request);
            return Response.json({ messages: [message] });
          },
        },
        CHAT_BACKEND_URL: "https://unused.example.com",
      },
      roomPath("lobby", "/messages"),
      { headers: { accept: "application/json" } },
      (() => { throw new Error("Unexpected network request"); }) as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).pathname).toBe("/api/rooms/lobby/messages");
    expect(requests[0].headers.get("accept")).toBe("application/json");
  });

  it("can tunnel WebSocket upgrade headers through the service binding", async () => {
    let upgrade: string | null = null;
    await fetchChatBackend(
      {
        CHAT_SERVICE: {
          fetch: async (request) => {
            upgrade = request.headers.get("upgrade");
            return new Response("Upgrade accepted");
          },
        },
      },
      roomPath("drivers", "/socket"),
      { headers: { upgrade: "websocket" } },
    );

    expect(upgrade).toBe("websocket");
  });

  it("supports an explicit development backend origin without forwarding browser cookies", async () => {
    const captured: Request[] = [];
    const response = await fetchChatBackend(
      { CHAT_BACKEND_URL: "http://127.0.0.1:9876" },
      roomPath("lobby"),
      { headers: { accept: "application/json" } },
      (async (request: Request) => {
        captured.push(request);
        return Response.json({ messages: [] });
      }) as typeof fetch,
    );

    expect(response.ok).toBe(true);
    expect(captured[0]?.url).toBe("http://127.0.0.1:9876/api/rooms/lobby");
    expect(captured[0]?.headers.get("cookie")).toBeNull();
  });

  it("refuses missing and malformed backend configuration", async () => {
    await expect(fetchChatBackend({}, roomPath("lobby"))).rejects.toBeInstanceOf(
      ChatBackendUnavailable,
    );
    await expect(
      fetchChatBackend({ CHAT_BACKEND_URL: "https://example.com/private" }, roomPath("lobby")),
    ).rejects.toBeInstanceOf(ChatBackendUnavailable);
    await expect(fetchChatBackend({}, "//malicious.example/path")).rejects.toThrow(
      "Invalid chat backend path",
    );
  });
});
