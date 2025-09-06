"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ensureUser_1 = require("../utils/ensureUser");
const db_1 = require("../utils/db");
const myMovies = (0, express_1.Router)();
myMovies.get("/", async (req, res, next) => {
    try {
        const username = await (0, ensureUser_1.ensureUser)(req.query.username);
        const { rows } = await (0, db_1.q)(`SELECT username, "Title", "Year", "Runtime", "Genre", "Director", "Favourite"
         FROM user_movies
        WHERE username = $1
         ORDER BY created_at DESC`, [username]);
        res.json({ movies: rows });
    }
    catch (e) {
        next(e);
    }
});
myMovies.post("/", async (req, res, next) => {
    try {
        const username = await (0, ensureUser_1.ensureUser)(req.body.username);
        const Title = String(req.body.Title || "").trim();
        const Year = req.body.Year ?? null;
        const Runtime = req.body.Runtime ?? null;
        const Genre = req.body.Genre ?? null;
        const Director = req.body.Director ?? null;
        const Favourite = req.body.Favourite ?? null;
        if (!Title || !Year)
            return res
                .status(400)
                .json({ error: "Title and 4-digit Year are required" });
        await (0, db_1.q)(`INSERT INTO user_movies (username, "Title", "Year", "Runtime", "Genre", "Director", "Favourite")
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (username, "Title") DO UPDATE SET
         "Year"=$3, "Runtime"=$4, "Genre"=$5, "Director"=$6, "Favourite"=$7, updated_at=now()`, [username, Title, Year, Runtime, Genre, Director, Favourite]);
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
myMovies.patch("/", async (req, res, next) => {
    try {
        const username = await (0, ensureUser_1.ensureUser)(req.body.username);
        const Title = String(req.body.Title || "").trim();
        if (!Title)
            return res.status(400).json({ error: "Title required" });
        const fields = [];
        const vals = [username, Title];
        let i = 3;
        if (req.body.Year !== undefined) {
            fields.push(`"Year" = $${i++}`);
            vals.push(req.body.Year);
        }
        if (req.body.Runtime !== undefined) {
            fields.push(`"Runtime" = $${i++}`);
            vals.push(req.body.Runtime ?? null);
        }
        if (req.body.Genre !== undefined) {
            fields.push(`"Genre" = $${i++}`);
            vals.push(req.body.Genre ?? null);
        }
        if (req.body.Director !== undefined) {
            fields.push(`"Director" = $${i++}`);
            vals.push(req.body.Director ?? null);
        }
        if (!fields.length)
            return res.json({ ok: true });
        await (0, db_1.q)(`UPDATE user_movies
          SET ${fields.join(", ")}, updated_at=now()
        WHERE username=$1 AND "Title"=$2`, vals);
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
myMovies.delete("/", async (req, res, next) => {
    try {
        const username = await (0, ensureUser_1.ensureUser)(req.query.username);
        const Title = String(req.query.Title || "").trim();
        if (!Title)
            return res.status(400).json({ error: "Title required" });
        await (0, db_1.q)(`DELETE FROM user_movies WHERE username=$1 AND "Title"=$2`, [
            username,
            Title,
        ]);
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
myMovies.patch("/favourite", async (req, res, next) => {
    try {
        const username = await (0, ensureUser_1.ensureUser)(req.body.username);
        const Title = String(req.body.Title || "").trim();
        const Favourite = !!req.body.Favourite;
        if (!Title)
            return res.status(400).json({ error: "Title required" });
        await (0, db_1.q)(`UPDATE user_movies
          SET "Favourite"=$3, updated_at=now()
        WHERE username=$1 AND "Title"=$2`, [username, Title, Favourite]);
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
exports.default = myMovies;
//# sourceMappingURL=myMovies.router.js.map