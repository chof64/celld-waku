export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  avatar: string;
  tone: "violet" | "mint" | "blue" | "peach";
}

export const demoRooms: readonly ChatRoom[] = [
  { id: "lobby", name: "General", description: "A place for everyone", avatar: "G", tone: "violet" },
  { id: "drivers", name: "Driver lounge", description: "Updates from the road", avatar: "D", tone: "mint" },
  { id: "dispatch", name: "Dispatch", description: "Plan and coordinate", avatar: "↗", tone: "blue" },
  { id: "support", name: "Support", description: "Ask the community", avatar: "?", tone: "peach" },
];

export function getRoom(id: string): ChatRoom {
  return demoRooms.find((room) => room.id === id) ?? {
    id,
    name: id.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
    description: "Community room",
    avatar: "#",
    tone: "violet",
  };
}
