import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import search from "./routes/search.router";
import myMovies from "./routes/myMovies.router";
import movie from "./routes/movie.router";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan("dev"));
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"] }));
app.use(express.json());

app.use("/api/movie", movie);
app.use("/api/search", search);
app.use("/api/my/movies", myMovies);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

export { app };