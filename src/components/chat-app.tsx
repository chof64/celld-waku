"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import {
  chatMessageSchema,
  historySchema,
  mergeMessages,
  roomPath,
  sendMessageSchema,
  socketEventSchema,
  type ChatMessage,
} from "../features/chat/contracts";
import type { ChatRoom } from "../features/chat/rooms";
import { ChatMessageRow } from "./chat-message";
import { ChatSidebar } from "./chat-sidebar";

type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

const NAME_STORAGE_KEY = "celld-waku-demo-name";

export function ChatApp({
  room,
  initialMessages,
  initialAvailable,
}: {
  room: ChatRoom;
  initialMessages: ChatMessage[];
  initialAvailable: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [displayName, setDisplayName] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [notice, setNotice] = useState(
    initialAvailable ? "" : "Chat history is unavailable. Connect the Hono chat backend.",
  );
  const [unread, setUnread] = useState(0);
  const messagesRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const historyUrl = roomPath(room.id, "/messages");

  useEffect(() => {
    try {
      setDisplayName(window.localStorage.getItem(NAME_STORAGE_KEY) ?? "");
    } catch {
      setDisplayName("");
    }
  }, []);

  const addMessages = useCallback((incoming: readonly ChatMessage[]) => {
    setMessages((current) => mergeMessages(current, incoming));
    if (!stickToBottom.current) {
      setUnread((current) => current + incoming.length);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const response = await fetch(roomPath(room.id, "/messages"), {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load chat history");

      const result = historySchema.safeParse(await response.json());
      if (!result.success) throw new Error("Invalid message history response");

      setMessages((current) => mergeMessages(current, result.data.messages));
      setNotice("");
    } catch {
      setNotice("Could not reach the chat backend. Messages will refresh when it reconnects.");
    }
  }, [room.id]);

  useEffect(() => {
    let stopped = false;
    let failures = 0;
    let active: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const reconnect = () => {
      if (stopped) return;
      failures += 1;
      setConnection("reconnecting");
      const delay = Math.min(1_000 * 2 ** Math.min(failures - 1, 4), 15_000);
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (stopped) return;
      setConnection(failures === 0 ? "connecting" : "reconnecting");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = protocol + "//" + window.location.host + roomPath(room.id, "/socket");

      try {
        const socket = new WebSocket(url);
        active = socket;
        socket.onopen = () => {
          if (stopped) return;
          failures = 0;
          setConnection("live");
          void refreshHistory();
        };
        socket.onmessage = (event) => {
          if (stopped || typeof event.data !== "string") return;
          try {
            const payload = socketEventSchema.safeParse(JSON.parse(event.data));
            if (payload.success) addMessages([payload.data.message]);
          } catch {
            // An unrecognized event must not disrupt the live connection.
          }
        };
        socket.onerror = () => {
          if (!stopped) setConnection("offline");
          socket.close();
        };
        socket.onclose = () => reconnect();
      } catch {
        reconnect();
      }
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      active?.close();
    };
  }, [addMessages, refreshHistory, room.id]);

  useEffect(() => {
    const feed = messagesRef.current;
    if (feed && stickToBottom.current) {
      feed.scrollTop = feed.scrollHeight;
      setUnread(0);
    }
  }, [messages]);

  const onScroll = () => {
    const feed = messagesRef.current;
    if (!feed) return;
    stickToBottom.current = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
    if (stickToBottom.current) setUnread(0);
  };

  const onNameChange = (value: string) => {
    setDisplayName(value);
    try {
      window.localStorage.setItem(NAME_STORAGE_KEY, value);
    } catch {
      // Browsers can disable storage; the conversation still works.
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    const input = sendMessageSchema.safeParse({ userName: displayName, text: draft });
    if (!input.success) {
      setNotice("Enter a display name and a message before sending.");
      return;
    }

    setSending(true);
    setNotice("");
    try {
      const response = await fetch(historyUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(input.data),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const reason =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "The message could not be sent.";
        throw new Error(reason);
      }
      const saved = chatMessageSchema.safeParse(await response.json());
      if (!saved.success) throw new Error("The chat backend returned an invalid message.");
      stickToBottom.current = true;
      addMessages([saved.data]);
      setDraft("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="chat-shell">
      <ChatSidebar activeRoomId={room.id} />

      <section className="chat-panel" aria-label={room.name + " chat room"}>
        <header className="room-header">
          <div className="room-title">
            <span className={"header-room-avatar tone-" + room.tone} aria-hidden="true">
              {room.avatar}
            </span>
            <div>
              <h1>{room.name}</h1>
              <p>{room.description}</p>
            </div>
          </div>
          <div className="room-header-actions">
            <span className={"connection connection-" + connection} role="status">
              <span className="connection-dot" aria-hidden="true" />
              {connection === "live"
                ? "Live"
                : connection === "reconnecting"
                  ? "Reconnecting"
                  : connection === "connecting"
                    ? "Connecting"
                    : "Offline"}
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label="Refresh messages"
              title="Refresh messages"
              onClick={() => void refreshHistory()}
            >↻</button>
          </div>
        </header>

        <div className="message-feed" ref={messagesRef} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions">
          <div className="room-intro">
            <span className={"intro-icon tone-" + room.tone} aria-hidden="true">{room.avatar}</span>
            <h2>Welcome to {room.name}</h2>
            <p>This is the start of the conversation. Every room has its own Durable Object.</p>
          </div>
          <div className="message-divider"><span>CONVERSATION</span></div>
          {messages.length === 0 && (
            <div className="message-empty">
              No messages here yet. Say hello to get the conversation started.
            </div>
          )}
          <div className="message-list">
            {messages.map((message) => (
              <ChatMessageRow
                key={message.id}
                message={message}
                isSelf={
                  displayName.trim().length > 0 &&
                  message.userName.toLowerCase() === displayName.trim().toLowerCase()
                }
              />
            ))}
          </div>
        </div>

        {unread > 0 && (
          <button
            className="unread-button"
            type="button"
            onClick={() => {
              stickToBottom.current = true;
              messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
              setUnread(0);
            }}
          >
            {unread} new {unread === 1 ? "message" : "messages"} ↓
          </button>
        )}

        <div className="composer-area">
          {notice && <p className="chat-notice" role="alert">{notice}</p>}
          <form className="chat-form" onSubmit={(event) => void sendMessage(event)}>
            <div className="composer-top">
              <label htmlFor="chat-name">Posting as</label>
              <input
                id="chat-name"
                className="name-input"
                value={displayName}
                onChange={(event) => onNameChange(event.target.value)}
                maxLength={40}
                placeholder="Choose a display name"
                autoComplete="nickname"
                required
              />
              <span className="demo-label">Public demo</span>
            </div>
            <div className="composer-bottom">
              <label className="visually-hidden" htmlFor="chat-draft">Your message</label>
              <textarea
                id="chat-draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKeyDown}
                rows={2}
                maxLength={2_000}
                placeholder={"Message #" + room.id}
                disabled={sending}
                required
              />
              <button className="send-button" type="submit" disabled={sending || !draft.trim() || !displayName.trim()}>
                {sending ? "Sending…" : "Send"} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>
          <p className="composer-tip">Press <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for a new line</p>
        </div>
      </section>
    </div>
  );
}
