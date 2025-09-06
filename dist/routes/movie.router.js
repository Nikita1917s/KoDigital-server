"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../utils/db");
const movie = (0, express_1.Router)();
const OMDB = process.env.OMDB;
const KEY = process.env.OMDB_API_KEY;
movie.get("/", async (req, res, next) => {
    try {
        const username = req.query.username?.trim();
        const title = req.query.title?.trim();
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }
        if (username) {
            const { rows } = await (0, db_1.q)(`SELECT username, "Title", "Year", "Runtime", "Genre", "Director", "Favourite"
           FROM user_movies
          WHERE username = $1
            AND "Title" ILIKE $2
          ORDER BY created_at DESC
          LIMIT 1`, [username, title]);
            if (rows.length) {
                return res.json({ source: "db", movie: rows[0] });
            }
        }
        const r = await axios_1.default.get(OMDB, {
            params: { apikey: KEY, t: title, type: "movie" },
        });
        if (r.data?.Response !== "True") {
            return res.status(404).json({ error: "Movie not found" });
        }
        const d = r.data;
        const movie = {
            Title: d.Title ?? null,
            Year: d.Year ?? null,
            Runtime: d.Runtime ?? null,
            Genre: d.Genre ?? null,
            Director: d.Director ?? null,
            Favourite: false,
        };
        return res.json({ source: "omdb", movie });
    }
    catch (e) {
        next(e);
    }
});
exports.default = movie;
//# sourceMappingURL=movie.router.js.map