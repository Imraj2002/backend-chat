import knex, { type Knex } from "knex";
import { config } from "./config.js";

export function createDatabase(): Knex {
  return knex({
    client: config.databaseClient === "mysql" ? "mysql2" : "pg",
    connection: config.databaseUrl,
    pool: { min: 0, max: 10 },
  });
}

export async function ensureSchema(db: Knex): Promise<void> {
  await db.schema.createTableIfNotExists("users", (table) => {
    table.string("id", 128).primary();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  });

  await db.schema.createTableIfNotExists("chats", (table) => {
    table.string("id", 36).primary();
    table.string("user_a_id", 128).notNullable().references("users.id").onDelete("CASCADE");
    table.string("user_b_id", 128).notNullable().references("users.id").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.unique(["user_a_id", "user_b_id"]);
    table.index(["user_a_id", "created_at"]);
    table.index(["user_b_id", "created_at"]);
  });
}
