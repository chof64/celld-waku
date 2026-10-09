import { ChatApp } from "../components/chat-app";
import { loadChatHistory } from "../features/chat/backend.server";
import { getRoom } from "../features/chat/rooms";

export default async function HomePage() {
  const room = getRoom("lobby");
  const history = await loadChatHistory(room.id);

  return (
    <>
      <title>General · celld.chat</title>
      <meta name="description" content="A realtime React chat powered by Waku, Hono and Celld." />
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
