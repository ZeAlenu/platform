import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string.",
    );
  }
  const sql = neon(connectionString);
  return drizzle({ client: sql, schema, casing: "snake_case" });
}

let cached: Db | null = null;

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    cached ??= createDb();
    return Reflect.get(cached, prop, receiver);
  },
});

export { schema };
