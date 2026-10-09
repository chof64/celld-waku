import type { PageProps } from "waku/router";
import { unstable_notFound as notFound } from "waku/router/server";

import { ChatApp } from "../../components/chat-app";
import { loadChatHistory } from "../../features/chat/backend.server";
import { roomIdSchema } from "../../features/chat/contracts";
import { getRoom } from "../../features/chat/rooms";

export default async function RoomPage({
  roomId,
}: PageProps<"/rooms/[roomId]">) {
  const result = roomIdSchema.safeParse(roomId);
  if (!result.success) notFound();

  const room = getRoom(result.data);
  const history = await loadChatHistory(room.id);

  return (
    <>
      <title>{room.name} · celld.chat</title>
      <ChatApp
        key={room.id}
        room={room}
        initialMessages={history.messages}
        initialAvailable={history.available}
      />
    </>
  );
}

export const getConfig = async () => ({ render: "dynamic" as const });
