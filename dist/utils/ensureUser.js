"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUser = ensureUser;
const db_1 = require("../utils/db");
async function ensureUser(raw) {
    const username = String(raw || "").trim().toLowerCase();
    if (!username)
        throw new Error("Username required");
    const res = await (0, db_1.q)(`INSERT INTO users (username)
     VALUES ($1)
     ON CONFLICT (username) DO NOTHING`, [username]);
    return username;
}
//# sourceMappingURL=ensureUser.js.map