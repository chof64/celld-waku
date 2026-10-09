import { z } from "zod";

export const roomIdSchema = z.string().regex(/^[a-z0-9-]{1,48}$/);

export const sendMessageSchema = z.object({
  userName: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(2_000),
});

export const chatMessageSchema = sendMessageSchema.extend({
  id: z.string().uuid(),
  sentAt: z.number().int().nonnegative(),
});

export const historySchema = z.object({
  messages: z.array(chatMessageSchema),
});

export const socketEventSchema = z.object({
  type: z.literal("message"),
  message: chatMessageSchema,
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type SendMessage = z.infer<typeof sendMessageSchema>;

export function mergeMessages(
  previous: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...previous, ...incoming]) {
    byId.set(message.id, message);
  }
  return [...byId.values()]
    .sort((left, right) => left.sentAt - right.sentAt || left.id.localeCompare(right.id))
    .slice(-100);
}

export function roomPath(roomId: string, suffix = ""): string {
  return "/api/rooms/" + encodeURIComponent(roomId) + suffix;
}
