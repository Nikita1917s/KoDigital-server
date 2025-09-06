import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import search from "./routes/search.router";
import myMovies from "./routes/myMovies.router";
import movie from "./routes/movie.router";

const app = express();
const PORT = process.env.PORT || 3001;


const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map(o => o.trim());

app.use(morgan("dev"));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use("/api/movie", movie);
app.use("/api/search", search);
app.use("/api/my/movies", myMovies);

app.get("/api/health", (_, res) => {
  res.status(200).send("OK");
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

export { app };
