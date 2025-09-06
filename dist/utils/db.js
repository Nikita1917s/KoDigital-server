"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.q = exports.pool = void 0;
const pg_1 = require("pg");
require("dotenv/config");
if (process.env.NODE_ENV === "test") {
    throw new Error("db.ts loaded during tests — mock '@/utils/db' in your test.");
}
const useSSL = process.env.PGSSLMODE === "require";
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});
const q = (text, params) => exports.pool.query(text, params);
exports.q = q;
//# sourceMappingURL=db.js.map