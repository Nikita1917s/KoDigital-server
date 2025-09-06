"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const search_router_1 = __importDefault(require("./routes/search.router"));
const myMovies_router_1 = __importDefault(require("./routes/myMovies.router"));
const movie_router_1 = __importDefault(require("./routes/movie.router"));
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map(o => o.trim());
app.use((0, morgan_1.default)("dev"));
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
app.use(express_1.default.json());
app.use("/api/movie", movie_router_1.default);
app.use("/api/search", search_router_1.default);
app.use("/api/my/movies", myMovies_router_1.default);
app.get("/api/health", (_, res) => {
    res.status(200).send("OK");
});
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`API listening on port ${PORT}`);
    });
}
//# sourceMappingURL=index.js.map