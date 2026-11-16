import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_CLIENT: z.enum(["postgres", "mysql"]).default("postgres"),
  DATABASE_URL: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  throw new Error(`Invalid environment configuration: ${parsedConfig.error.message}`);
}

export const config = {
  port: parsedConfig.data.PORT,
  databaseClient: parsedConfig.data.DATABASE_CLIENT,
  databaseUrl: parsedConfig.data.DATABASE_URL,
  firebaseProjectId: parsedConfig.data.FIREBASE_PROJECT_ID,
};
