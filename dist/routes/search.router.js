"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const ensureUser_1 = require("../utils/ensureUser");
const db_1 = require("../utils/db");
const search = (0, express_1.Router)();
const OMDB = process.env.OMDB;
const KEY = process.env.OMDB_API_KEY;
search.get("/", async (req, res, next) => {
    try {
        const qtext = String(req.query.q || "").trim();
        if (!qtext)
            return res.json({ movies: [] });
        const page = Number(req.query.page || 1);
        const s = await axios_1.default.get(OMDB, {
            params: { apikey: KEY, s: qtext, type: "movie", page },
        });
        if (s.data?.Response !== "True" || !Array.isArray(s.data?.Search)) {
            return res.json({ movies: [] });
        }
        const movies = s.data?.Search;
        res.json({ movies });
    }
    catch (e) {
        console.log(e);
        next(e);
    }
});
search.get("/save", async (req, res, next) => {
    try {
        const qtext = String(req.query.q || "").trim();
        const username = await (0, ensureUser_1.ensureUser)(req.query.username);
        if (!qtext)
            return res.json({ movies: [] });
        const page = Number(req.query.page || 1);
        const s = await axios_1.default.get(OMDB, {
            params: { apikey: KEY, s: qtext, type: "movie", page },
        });
        if (s.data?.Response === "True" && Array.isArray(s.data?.Search)) {
            const ids = s.data.Search.map((x) => x.imdbID).slice(0, 10);
            const details = await Promise.all(ids.map((id) => axios_1.default.get(OMDB, { params: { apikey: KEY, i: id } })));
            for (const d of details) {
                const row = d.data;
                if (!row.Title || !row.Year)
                    continue;
                await (0, db_1.q)(`INSERT INTO user_movies (username, "Title", "Year", "Runtime", "Genre", "Director")
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (username, "Title") DO UPDATE SET
             "Year"=$3, "Runtime"=$4, "Genre"=$5, "Director"=$6, updated_at=now()`, [username, row.Title, row.Year, row.Runtime, row.Genre, row.Director]);
            }
        }
        const { rows } = await (0, db_1.q)(`SELECT username, "Title", "Year", "Runtime", "Genre", "Director", "Favourite"
         FROM user_movies
        WHERE username = $1
          AND ("Title" ILIKE $2 OR "Genre" ILIKE $2 OR "Director" ILIKE $2)
         ORDER BY created_at DESC`, [username, `%${qtext}%`]);
        res.json({ movies: rows });
    }
    catch (e) {
        next(e);
    }
});
exports.default = search;
//# sourceMappingURL=search.router.js.map