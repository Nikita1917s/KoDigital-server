import { q } from "@/utils/db"; 

export async function ensureUser(raw: string): Promise<string> {
  const username = String(raw || "").trim().toLowerCase();
  if (!username) throw new Error("Username required");

  const res = await q(
    `INSERT INTO users (username)
     VALUES ($1)
     ON CONFLICT (username) DO NOTHING`,
    [username]
  );

  return username;
}
