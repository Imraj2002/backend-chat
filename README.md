# Chat Backend

A TypeScript/Express 1:1 chat API. User and chat records are stored in PostgreSQL or MySQL; messages, per-user read receipts, and last-seen pointers are stored in Firebase Firestore.

## Requirements

- Node.js 22.18 or newer
- PostgreSQL or MySQL
- A Firebase project with Firestore enabled
- Firebase Application Default Credentials (for example, `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON file)

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_CLIENT` to `postgres` or `mysql`, `DATABASE_URL`, and `FIREBASE_PROJECT_ID`.
3. Configure Firebase Application Default Credentials in the environment.
4. Run `npm run dev` for development or `npm run build && npm start` for production.

On startup, the service creates the `users` and `chats` relational tables if they do not already exist. User rows are inserted when a 1:1 chat is created.

## API

- `POST /chat/create` — JSON `{ "userAId": "user-1", "userBId": "user-2" }`; returns `{ "chatId": "..." }`. Repeated requests for the same pair return the existing chat.
- `POST /chat/:chatId/message/send` — JSON `{ "senderId": "user-1", "text": "Hello" }`; returns the stored message.
- `GET /chat/:chatId/messages?limit=50` — returns the newest messages in ascending timestamp order. `limit` must be between 1 and 100; it defaults to 50.
- `POST /chat/:chatId/message/:messageId/read` — JSON `{ "userId": "user-2" }`; writes a read receipt under that message.
- `POST /chat/:chatId/lastseen` — JSON `{ "userId": "user-2", "messageId": "..." }`; updates that user's last-seen message for the chat.
- `GET /user/:userId/chats` — returns chat IDs, member IDs, and creation timestamps from the relational database.

Chat members are checked before sending messages or updating read/last-seen state. This API accepts user IDs directly and does not implement authentication; deploy it behind an authenticated identity layer before exposing it to clients.
