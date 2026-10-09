export interface ChatBackendBindings {
  CHAT_SERVICE?: { fetch(request: Request): Promise<Response> };
  CHAT_BACKEND_URL?: string;
}

export class ChatBackendUnavailable extends Error {
  constructor(message = "Chat backend is unavailable") {
    super(message);
    this.name = "ChatBackendUnavailable";
  }
}

function upstreamUrl(bindings: ChatBackendBindings, path: string): URL {
  const configured = bindings.CHAT_BACKEND_URL;
  if (!configured) {
    throw new ChatBackendUnavailable(
      "Configure CHAT_SERVICE or CHAT_BACKEND_URL to connect the chat backend",
    );
  }

  let base: URL;
  try {
    base = new URL(configured);
  } catch {
    throw new ChatBackendUnavailable("CHAT_BACKEND_URL must be an absolute URL");
  }

  if (
    (base.protocol !== "http:" && base.protocol !== "https:") ||
    base.username !== "" ||
    base.password !== "" ||
    base.pathname !== "/" ||
    base.search !== "" ||
    base.hash !== ""
  ) {
    throw new ChatBackendUnavailable("CHAT_BACKEND_URL must be an HTTP(S) origin");
  }

  const target = new URL(base.origin);
  target.pathname = path;
  return target;
}

export async function fetchChatBackend(
  bindings: ChatBackendBindings,
  path: string,
  init: RequestInit = {},
  networkFetch: typeof fetch = fetch,
): Promise<Response> {
  if (!path.startsWith("/api/rooms/") || path.includes("?") || path.includes("#")) {
    throw new Error("Invalid chat backend path");
  }

  if (bindings.CHAT_SERVICE) {
    const target = new URL("https://chat.internal");
    target.pathname = path;
    return bindings.CHAT_SERVICE.fetch(new Request(target, init));
  }

  return networkFetch(new Request(upstreamUrl(bindings, path), init));
}

export function chatGatewayError(error: unknown): Response {
  if (!(error instanceof ChatBackendUnavailable)) {
    console.error("Chat gateway request failed", error);
  }
  return Response.json(
    { error: "Chat service is unavailable. Check the Hono backend connection." },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}
