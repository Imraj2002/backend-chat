import { createApp } from "./app.js";
import { config } from "./config.js";
import { createDatabase, ensureSchema } from "./database.js";
import { firestore } from "./firestore.js";

const db = createDatabase();

try {
  await ensureSchema(db);
  const app = createApp({ db, firestore });
  const server = app.listen(config.port, () => {
    console.log(`Chat backend listening on port ${config.port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received; shutting down`);
    server.close(async (error) => {
      if (error) {
        console.error("Error closing HTTP server", error);
        process.exitCode = 1;
      }
      await db.destroy();
      process.exit();
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  console.error("Failed to start chat backend", error);
  await db.destroy();
  process.exitCode = 1;
}
