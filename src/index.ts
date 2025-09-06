import "dotenv/config";
import express from "express";
import cors, { type CorsOptions } from "cors";
import morgan from "morgan";
import search from "./routes/search.router";
import myMovies from "./routes/myMovies.router";
import movie from "./routes/movie.router";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (
  process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

console.log("Allowed origins:", allowedOrigins);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow requests without Origin (curl, health checks, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(morgan("dev"));
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
