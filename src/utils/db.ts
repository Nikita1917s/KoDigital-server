import { Pool } from "pg";
import "dotenv/config";

if (process.env.NODE_ENV === "test") {
  throw new Error("db.ts loaded during tests — mock '@/utils/db' in your test.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

export const q = (text: string, params?: any[]) => pool.query(text, params);
