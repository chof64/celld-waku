import type { ChatMessage } from "../features/chat/contracts";

function avatarTone(name: string): string {
  const total = [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return ["violet", "mint", "peach", "blue"][total % 4];
}

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(timestamp) + " UTC";
}

export function ChatMessageRow({
  message,
  isSelf,
}: {
  message: ChatMessage;
  isSelf: boolean;
}) {
  const initials = message.userName.trim().slice(0, 2).toUpperCase();

  return (
    <article className={"message-row" + (isSelf ? " message-row-self" : "")}>
      <div className={"message-avatar tone-" + avatarTone(message.userName)} aria-hidden="true">
        {initials}
      </div>
      <div className="message-content">
        <div className="message-meta">
          <strong>{message.userName}</strong>
          {isSelf && <span className="message-you">you</span>}
          <time dateTime={new Date(message.sentAt).toISOString()}>
            {timeLabel(message.sentAt)}
          </time>
        </div>
        <p>{message.text}</p>
      </div>
    </article>
  );
}
