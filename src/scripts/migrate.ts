import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import "dotenv/config";
import { pool, q } from "@/utils/db";

async function run() {
  const probe = await q(
    "SELECT CURRENT_USER, CURRENT_DATABASE(), inet_server_addr()::text addr, inet_server_port()::int port"
  );
  console.log("Connected as:", probe.rows[0]);

  const dir = join(process.cwd(), "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No .sql migration files found in", dir);
    return;
  }

  for (const f of files) {
    const full = join(dir, f);
    const sql = readFileSync(full, "utf8");
    console.log("Applying", f);

    await q("BEGIN");
    try {
      await q(sql);
      await q("COMMIT");
    } catch (e) {
      await q("ROLLBACK");
      throw new Error(`Failed on ${f}: ${(e as Error).message}`);
    }
  }

  console.log("Migrations complete ✅");
}

run()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
