"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const { qMock } = vitest_1.vi.hoisted(() => ({ qMock: vitest_1.vi.fn() }));
vitest_1.vi.mock("@/utils/db", () => ({ q: qMock }));
vitest_1.vi.mock("axios", () => ({ default: { get: vitest_1.vi.fn() } }));
vitest_1.vi.mock("pg", () => ({
    Pool: vitest_1.vi.fn(() => ({ query: vitest_1.vi.fn(), end: vitest_1.vi.fn() })),
}));
const supertest_1 = __importDefault(require("supertest"));
const __1 = require("..");
const axios_1 = __importDefault(require("axios"));
const axiosGet = axios_1.default.get;
const selectOneForUser = /^\s*SELECT[\s\S]*FROM\s+user_movies[\s\S]*WHERE[\s\S]*username\s*=\s*\$1[\s\S]*"Title"\s+ILIKE\s+\$2[\s\S]*LIMIT\s+1/i;
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
    qMock.mockReset();
    axiosGet.mockReset();
    qMock.mockImplementation(async (sql) => {
        if (/\bSELECT\b[\s\S]*\bFROM\s+user_movies\b/i.test(String(sql))) {
            return { rows: [] };
        }
        return undefined;
    });
});
(0, vitest_1.describe)("GET /api/movie", () => {
    (0, vitest_1.it)("400 when title missing", async () => {
        const res = await (0, supertest_1.default)(__1.app).get("/api/movie?username=nikita");
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body).toHaveProperty("error", "Title is required");
        (0, vitest_1.expect)(axiosGet).not.toHaveBeenCalled();
        (0, vitest_1.expect)(qMock).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("returns from DB when username provided and row exists", async () => {
        // Return a row for the first SELECT call
        qMock.mockImplementationOnce(async (sql, params) => {
            (0, vitest_1.expect)(String(sql)).toMatch(selectOneForUser);
            (0, vitest_1.expect)(params).toEqual(["nikita", "Matrix"]);
            return {
                rows: [
                    {
                        username: "nikita",
                        Title: "Matrix",
                        Year: "1999",
                        Runtime: "136",
                        Genre: "Action, Sci-Fi",
                        Director: "Wachowski",
                        Favourite: true,
                    },
                ],
            };
        });
        const res = await (0, supertest_1.default)(__1.app).get("/api/movie?username=nikita&title=Matrix");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.source).toBe("db");
        (0, vitest_1.expect)(res.body.movie).toEqual({
            username: "nikita",
            Title: "Matrix",
            Year: "1999",
            Runtime: "136",
            Genre: "Action, Sci-Fi",
            Director: "Wachowski",
            Favourite: true,
        });
        (0, vitest_1.expect)(qMock).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(axiosGet).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("falls back to OMDB when no DB row and OMDB returns True", async () => {
        qMock.mockImplementationOnce(async (sql, params) => {
            (0, vitest_1.expect)(String(sql)).toMatch(selectOneForUser);
            (0, vitest_1.expect)(params).toEqual(["nikita", "Matrix"]);
            return { rows: [] };
        });
        axiosGet.mockResolvedValueOnce({
            data: {
                Response: "True",
                Title: "The Matrix",
                Year: "1999",
                Runtime: "136 min",
                Genre: "Action, Sci-Fi",
                Director: "Lana Wachowski, Lilly Wachowski",
            },
        });
        const res = await (0, supertest_1.default)(__1.app).get("/api/movie?username=nikita&title=Matrix");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.source).toBe("omdb");
        (0, vitest_1.expect)(res.body.movie).toEqual({
            Title: "The Matrix",
            Year: "1999",
            Runtime: "136 min",
            Genre: "Action, Sci-Fi",
            Director: "Lana Wachowski, Lilly Wachowski",
            Favourite: false,
        });
        (0, vitest_1.expect)(qMock).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(axiosGet).toHaveBeenCalledTimes(1);
        const [url, opts] = axiosGet.mock.calls[0];
        (0, vitest_1.expect)(typeof url).toBe("string");
        (0, vitest_1.expect)(opts).toMatchObject({
            params: vitest_1.expect.objectContaining({ t: "Matrix", type: "movie" }),
        });
    });
    (0, vitest_1.it)("returns 404 when OMDB says not found", async () => {
        axiosGet.mockResolvedValueOnce({
            data: { Response: "False", Error: "Movie not found!" },
        });
        const res = await (0, supertest_1.default)(__1.app).get("/api/movie?username=nikita&title=Nonexistent");
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body).toEqual({ error: "Movie not found" });
        (0, vitest_1.expect)(qMock).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(axiosGet).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)("without username, queries OMDB directly", async () => {
        axiosGet.mockResolvedValueOnce({
            data: {
                Response: "True",
                Title: "Inception",
                Year: "2010",
                Runtime: "148 min",
                Genre: "Action, Adventure, Sci-Fi",
                Director: "Christopher Nolan",
            },
        });
        const res = await (0, supertest_1.default)(__1.app).get("/api/movie?title=Inception");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.source).toBe("omdb");
        (0, vitest_1.expect)(res.body.movie).toEqual({
            Title: "Inception",
            Year: "2010",
            Runtime: "148 min",
            Genre: "Action, Adventure, Sci-Fi",
            Director: "Christopher Nolan",
            Favourite: false,
        });
        (0, vitest_1.expect)(qMock).not.toHaveBeenCalled();
        (0, vitest_1.expect)(axiosGet).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=movie.routes.test.js.map