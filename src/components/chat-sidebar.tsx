import { Link } from "waku";

import { demoRooms, type ChatRoom } from "../features/chat/rooms";

export function ChatSidebar({ activeRoomId }: { activeRoomId: string }) {
  return (
    <aside className="sidebar" aria-label="Chat workspace">
      <div className="workspace-header">
        <div className="workspace-logo" aria-hidden="true">c</div>
        <div>
          <strong>celld<span className="brand-dot">.</span>chat</strong>
          <p>Community workspace</p>
        </div>
      </div>

      <div className="sidebar-section-header">
        <span>CHANNELS</span>
        <span className="channel-count">{demoRooms.length}</span>
      </div>

      <nav className="room-list" aria-label="Chat rooms">
        {demoRooms.map((room) => (
          <RoomLink key={room.id} room={room} active={room.id === activeRoomId} />
        ))}
      </nav>

      <div className="sidebar-note">
        <div className="sidebar-note-icon" aria-hidden="true">✦</div>
        <strong>Made for real time.</strong>
        <p>React on Waku. Messages on a Celld Durable Object, served by Hono.</p>
      </div>

      <div className="sidebar-footer">
        <span className="footer-pulse" aria-hidden="true" />
        <span>Open-source reference app</span>
      </div>
    </aside>
  );
}

function RoomLink({ room, active }: { room: ChatRoom; active: boolean }) {
  const destination =
    room.id === "lobby"
      ? "/"
      : { to: "/rooms/[roomId]" as const, params: { roomId: room.id } };

  return (
    <Link
      to={destination}
      className={"room-link" + (active ? " room-link-active" : "")}
      aria-current={active ? "page" : undefined}
    >
      <span className={"room-avatar tone-" + room.tone} aria-hidden="true">{room.avatar}</span>
      <span className="room-link-text">
        <strong>{room.name}</strong>
        <small>{room.description}</small>
      </span>
      {active && <span className="room-current-mark" aria-hidden="true" />}
    </Link>
  );
}
