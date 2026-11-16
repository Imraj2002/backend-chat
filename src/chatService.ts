import { FieldPath, FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { Knex } from "knex";
import { HttpError } from "./errors.js";

interface ChatRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: Date | string;
}

interface MessageData {
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

function orderedUsers(userAId: string, userBId: string): [string, string] {
  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
}

function messageCollection(firestore: Firestore, chatId: string) {
  return firestore.collection("chats").doc(chatId).collection("messages");
}

function serializeChat(row: ChatRow) {
  return {
    chatId: row.id,
    memberIds: [row.user_a_id, row.user_b_id],
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function serializeMessage(id: string, data: MessageData) {
  return {
    messageId: id,
    senderId: data.senderId,
    text: data.text,
    createdAt: data.createdAt.toDate().toISOString(),
  };
}

export class ChatService {
  constructor(
    private readonly db: Knex,
    private readonly firestore: Firestore,
  ) {}

  async createOrGetChat(userAId: string, userBId: string): Promise<string> {
    const [firstUserId, secondUserId] = orderedUsers(userAId, userBId);

    return this.db.transaction(async (trx) => {
      await trx("users").insert([{ id: firstUserId }, { id: secondUserId }]).onConflict("id").ignore();

      const chatId = crypto.randomUUID();
      await trx("chats")
        .insert({
          id: chatId,
          user_a_id: firstUserId,
          user_b_id: secondUserId,
        })
        .onConflict(["user_a_id", "user_b_id"])
        .ignore();

      const chat = await trx<ChatRow>("chats")
        .where({ user_a_id: firstUserId, user_b_id: secondUserId })
        .first();
      if (!chat) {
        throw new Error("Chat could not be created or retrieved");
      }
      return chat.id;
    });
  }

  async sendMessage(chatId: string, senderId: string, text: string) {
    await this.requireChatMember(chatId, senderId);

    const messageRef = messageCollection(this.firestore, chatId).doc();
    await messageRef.set({
      senderId,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });

    const savedMessage = await messageRef.get();
    const data = savedMessage.data() as MessageData | undefined;
    if (!data || !(data.createdAt instanceof Timestamp)) {
      throw new Error("Firestore did not return the saved message timestamp");
    }

    return serializeMessage(savedMessage.id, data);
  }

  async getMessages(chatId: string, limit: number) {
    const chat = await this.db<ChatRow>("chats").where({ id: chatId }).first();
    if (!chat) {
      throw new HttpError(404, "Chat not found");
    }

    const snapshot = await messageCollection(this.firestore, chatId)
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit)
      .get();

    return snapshot.docs.reverse().map((document) => {
      const data = document.data() as MessageData;
      return serializeMessage(document.id, data);
    });
  }

  async markMessageRead(chatId: string, messageId: string, userId: string): Promise<void> {
    await this.requireChatMember(chatId, userId);

    const messageRef = messageCollection(this.firestore, chatId).doc(messageId);
    const message = await messageRef.get();
    if (!message.exists) {
      throw new HttpError(404, "Message not found");
    }

    await messageRef.collection("readReceipts").doc(userId).set({
      userId,
      readAt: FieldValue.serverTimestamp(),
    });
  }

  async updateLastSeen(chatId: string, messageId: string, userId: string): Promise<void> {
    await this.requireChatMember(chatId, userId);

    const message = await messageCollection(this.firestore, chatId).doc(messageId).get();
    if (!message.exists) {
      throw new HttpError(404, "Message not found");
    }

    await this.firestore.collection("chats").doc(chatId)
      .collection("lastSeen")
      .doc(userId)
      .set({
        userId,
        messageId,
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  async listUserChats(userId: string) {
    const rows = await this.db<ChatRow>("chats")
      .where("user_a_id", userId)
      .orWhere("user_b_id", userId)
      .orderBy("created_at", "desc");
    return rows.map(serializeChat);
  }

  private async requireChatMember(chatId: string, userId: string): Promise<ChatRow> {
    const chat = await this.db<ChatRow>("chats").where({ id: chatId }).first();
    if (!chat) {
      throw new HttpError(404, "Chat not found");
    }
    if (chat.user_a_id !== userId && chat.user_b_id !== userId) {
      throw new HttpError(403, "User is not a member of this chat");
    }
    return chat;
  }
}
