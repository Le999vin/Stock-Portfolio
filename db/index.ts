import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Pool uses WebSocket connections — required for transaction support (Better Auth needs this)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle({ client: pool, schema });

export * from "./schema";
