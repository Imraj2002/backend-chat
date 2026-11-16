import { HttpError } from "./errors.js";
import { z } from "zod";

const idSchema = z.string().trim().min(1).max(128).refine(
  (value) => !value.includes("/") && value !== "." && value !== "..",
  "Must be a valid ID",
);

export const createChatSchema = z.object({
  userAId: idSchema,
  userBId: idSchema,
}).refine((value) => value.userAId !== value.userBId, {
  message: "A chat requires two distinct users",
});

export const sendMessageSchema = z.object({
  senderId: idSchema,
  text: z.string().trim().min(1).max(10_000),
});

export const userIdSchema = z.object({ userId: idSchema });
export const lastSeenSchema = z.object({
  userId: idSchema,
  messageId: idSchema,
});

export function parseMessageLimit(value: unknown): number {
  if (value === undefined) {
    return 50;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "limit must be an integer between 1 and 100");
  }

  const parsed = z.coerce.number().int().min(1).max(100).safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, "limit must be an integer between 1 and 100");
  }
  return parsed.data;
}
