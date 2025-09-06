import { Pool } from "pg";
import "dotenv/config";

if (process.env.NODE_ENV === "test") {
  throw new Error("db.ts loaded during tests — mock '@/utils/db' in your test.");
}
const useSSL = process.env.PGSSLMODE === "require";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

export const q = (text: string, params?: any[]) => pool.query(text, params);
