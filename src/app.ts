import express, { type ErrorRequestHandler } from "express";
import type { Firestore } from "firebase-admin/firestore";
import type { Knex } from "knex";
import { ChatService } from "./chatService.js";
import { HttpError } from "./errors.js";
import {
  createChatSchema,
  lastSeenSchema,
  parseMessageLimit,
  sendMessageSchema,
  userIdSchema,
} from "./validation.js";

interface AppDependencies {
  db: Knex;
  firestore: Firestore;
}

export function createApp({ db, firestore }: AppDependencies) {
  const app = express();
  const chatService = new ChatService(db, firestore);

  app.use(express.json({ limit: "64kb" }));

  app.post("/chat/create", async (request, response) => {
    const input = createChatSchema.safeParse(request.body);
    if (!input.success) {
      throw new HttpError(400, input.error.issues[0]?.message ?? "Invalid request body");
    }
    const chatId = await chatService.createOrGetChat(input.data.userAId, input.data.userBId);
    response.status(200).json({ chatId });
  });

  app.post("/chat/:chatId/message/send", async (request, response) => {
    const input = sendMessageSchema.safeParse(request.body);
    if (!input.success) {
      throw new HttpError(400, input.error.issues[0]?.message ?? "Invalid request body");
    }
    const message = await chatService.sendMessage(
      request.params.chatId!,
      input.data.senderId,
      input.data.text,
    );
    response.status(201).json(message);
  });

  app.get("/chat/:chatId/messages", async (request, response) => {
    const limit = parseMessageLimit(request.query.limit);
    const messages = await chatService.getMessages(request.params.chatId!, limit);
    response.json(messages);
  });

  app.post("/chat/:chatId/message/:messageId/read", async (request, response) => {
    const input = userIdSchema.safeParse(request.body);
    if (!input.success) {
      throw new HttpError(400, input.error.issues[0]?.message ?? "Invalid request body");
    }
    await chatService.markMessageRead(request.params.chatId!, request.params.messageId!, input.data.userId);
    response.status(204).end();
  });

  app.post("/chat/:chatId/lastseen", async (request, response) => {
    const input = lastSeenSchema.safeParse(request.body);
    if (!input.success) {
      throw new HttpError(400, input.error.issues[0]?.message ?? "Invalid request body");
    }
    await chatService.updateLastSeen(
      request.params.chatId!,
      input.data.messageId,
      input.data.userId,
    );
    response.status(204).end();
  });

  app.get("/user/:userId/chats", async (request, response) => {
    const input = userIdSchema.safeParse({ userId: request.params.userId });
    if (!input.success) {
      throw new HttpError(400, input.error.issues[0]?.message ?? "Invalid user ID");
    }
    const chats = await chatService.listUserChats(input.data.userId);
    response.json(chats);
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof HttpError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    if (
      typeof error === "object"
      && error !== null
      && "status" in error
      && typeof error.status === "number"
      && error.status >= 400
      && error.status < 500
    ) {
      response.status(error.status).json({ error: "Invalid request" });
      return;
    }

    console.error("Unhandled request error", error);
    response.status(500).json({ error: "Internal server error" });
  };

  app.use(errorHandler);
  return app;
}
