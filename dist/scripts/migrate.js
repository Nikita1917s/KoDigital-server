"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
require("dotenv/config");
const db_1 = require("../utils/db");
async function run() {
    const probe = await (0, db_1.q)("SELECT CURRENT_USER, CURRENT_DATABASE(), inet_server_addr()::text addr, inet_server_port()::int port");
    console.log("Connected as:", probe.rows[0]);
    const dir = (0, path_1.join)(process.cwd(), "migrations");
    const files = (0, fs_1.readdirSync)(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    if (files.length === 0) {
        console.log("No .sql migration files found in", dir);
        return;
    }
    for (const f of files) {
        const full = (0, path_1.join)(dir, f);
        const sql = (0, fs_1.readFileSync)(full, "utf8");
        console.log("Applying", f);
        await (0, db_1.q)("BEGIN");
        try {
            await (0, db_1.q)(sql);
            await (0, db_1.q)("COMMIT");
        }
        catch (e) {
            await (0, db_1.q)("ROLLBACK");
            throw new Error(`Failed on ${f}: ${e.message}`);
        }
    }
    console.log("Migrations complete ✅");
}
run()
    .then(() => db_1.pool.end())
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map