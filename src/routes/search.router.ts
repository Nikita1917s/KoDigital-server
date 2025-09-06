import { Router } from "express";
import axios from "axios";
import { ensureUser } from "../utils/ensureUser";
import { q } from "@/utils/db";

const search = Router();
const OMDB = process.env.OMDB!;
const KEY = process.env.OMDB_API_KEY!;

search.get("/", async (req, res, next) => {
  try {
    const qtext = String(req.query.q || "").trim();
    if (!qtext) return res.json({ movies: [] });
    const page = Number(req.query.page || 1);
    const s = await axios.get(OMDB, {
      params: { apikey: KEY, s: qtext, type: "movie", page },
    });

    if (s.data?.Response !== "True" || !Array.isArray(s.data?.Search)) {
      return res.json({ movies: [] });
    }

    const movies = s.data?.Search;
    res.json({ movies });
  } catch (e) {
    console.log(e);
    next(e);
  }
});

search.get("/save", async (req, res, next) => {
  try {
    const qtext = String(req.query.q || "").trim();
    const username = await ensureUser(req.query.username as string);

    if (!qtext) return res.json({ movies: [] });

    const page = Number(req.query.page || 1);
    const s = await axios.get(OMDB, {
      params: { apikey: KEY, s: qtext, type: "movie", page },
    });

    if (s.data?.Response === "True" && Array.isArray(s.data?.Search)) {
      const ids = s.data.Search.map((x: any) => x.imdbID).slice(0, 10);
      const details = await Promise.all(
        ids.map((id: any) =>
          axios.get(OMDB, { params: { apikey: KEY, i: id } })
        )
      );

      for (const d of details) {
        const row = d.data;
        if (!row.Title || !row.Year) continue;
        await q(
          `INSERT INTO user_movies (username, "Title", "Year", "Runtime", "Genre", "Director")
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (username, "Title") DO UPDATE SET
             "Year"=$3, "Runtime"=$4, "Genre"=$5, "Director"=$6, updated_at=now()`,
          [username, row.Title, row.Year, row.Runtime, row.Genre, row.Director]
        );
      }
    }
    const { rows } = await q(
      `SELECT username, "Title", "Year", "Runtime", "Genre", "Director", "Favourite"
         FROM user_movies
        WHERE username = $1
          AND ("Title" ILIKE $2 OR "Genre" ILIKE $2 OR "Director" ILIKE $2)
         ORDER BY created_at DESC`,
      [username, `%${qtext}%`]
    );
    res.json({ movies: rows });
  } catch (e) {
    next(e);
  }
});

export default search;
