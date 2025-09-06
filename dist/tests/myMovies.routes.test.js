"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const { qMock } = vitest_1.vi.hoisted(() => ({ qMock: vitest_1.vi.fn() }));
vitest_1.vi.mock("@/utils/db", () => ({ q: qMock }));
vitest_1.vi.mock("pg", () => ({
    Pool: vitest_1.vi.fn(() => ({ query: vitest_1.vi.fn(), end: vitest_1.vi.fn() })),
}));
const __1 = require("..");
const supertest_1 = __importDefault(require("supertest"));
const re = {
    insertUser: /^\s*INSERT\s+INTO\s+users\b/i,
    selectAllForUser: /^\s*SELECT\s+username\b.*\bFROM\s+user_movies\b[\s\S]*WHERE\s+username\s*=\s*\$1\b/i,
    upsertUserMovie: /^\s*INSERT\s+INTO\s+user_movies\b/i,
    updateUserMovie: /^\s*UPDATE\s+user_movies\b/i,
    deleteUserMovie: /^\s*DELETE\s+FROM\s+user_movies\b/i,
};
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
    qMock.mockReset();
    qMock.mockImplementation(async (sql, params) => {
        const s = String(sql);
        // ensureUser()
        if (/^\s*INSERT\s+INTO\s+users\b/i.test(s))
            return;
        if (/^\s*SELECT\b[\s\S]*\bFROM\s+user_movies\b/i.test(s)) {
            return {
                rows: [
                    {
                        username: "nikita",
                        Title: "Film A",
                        Year: "1999",
                        Runtime: "90",
                        Genre: "Action",
                        Director: "X",
                        Favourite: false,
                    },
                    {
                        username: "nikita",
                        Title: "Film B",
                        Year: "2005",
                        Runtime: "101",
                        Genre: "Drama",
                        Director: "Y",
                        Favourite: true,
                    },
                ],
            };
        }
        // POST upsert
        if (/^\s*INSERT\s+INTO\s+user_movies\b/i.test(s))
            return;
        // PATCH update (both general and /favourite)
        if (/^\s*UPDATE\s+user_movies\b/i.test(s))
            return;
        // DELETE
        if (/^\s*DELETE\s+FROM\s+user_movies\b/i.test(s))
            return;
        throw new Error("Unexpected SQL in test");
    });
});
(0, vitest_1.describe)("GET /api/my/movies", () => {
    (0, vitest_1.it)("returns movies for user", async () => {
        const res = await (0, supertest_1.default)(__1.app).get("/api/my/movies?username=nikita");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.movies).toHaveLength(2);
        // ensure ensureUser() was called first
        (0, vitest_1.expect)(qMock).toHaveBeenCalledWith(vitest_1.expect.stringMatching(re.insertUser), [
            "nikita",
        ]);
    });
});
(0, vitest_1.describe)("POST /api/my/movies", () => {
    (0, vitest_1.it)("400s when Title or Year missing", async () => {
        const res = await (0, supertest_1.default)(__1.app).post("/api/my/movies").send({
            username: "nikita",
            // Title missing
            Year: "2000",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body).toHaveProperty("error");
    });
    (0, vitest_1.it)("upserts and returns ok: true", async () => {
        const res = await (0, supertest_1.default)(__1.app).post("/api/my/movies").send({
            username: "nikita",
            Title: "Matrix",
            Year: "1999",
            Runtime: "136",
            Genre: "Action, Sci-Fi",
            Director: "Wachowski",
            Favourite: true,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({ ok: true });
        // ensure ensureUser insert happened
        (0, vitest_1.expect)(qMock).toHaveBeenCalledWith(vitest_1.expect.stringMatching(re.insertUser), [
            "nikita",
        ]);
        // ensure upsert happened
        (0, vitest_1.expect)(qMock).toHaveBeenCalledWith(vitest_1.expect.stringMatching(re.upsertUserMovie), ["nikita", "Matrix", "1999", "136", "Action, Sci-Fi", "Wachowski", true]);
    });
});
(0, vitest_1.describe)("PATCH /api/my/movies", () => {
    (0, vitest_1.it)("400s when Title missing", async () => {
        const res = await (0, supertest_1.default)(__1.app).patch("/api/my/movies").send({
            username: "nikita",
            // Title missing
            Year: "2000",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body).toHaveProperty("error");
    });
    (0, vitest_1.it)("no-op when no fields provided", async () => {
        const res = await (0, supertest_1.default)(__1.app).patch("/api/my/movies").send({
            username: "nikita",
            Title: "Matrix",
            // no fields to update
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({ ok: true });
        // ensure no UPDATE executed
        (0, vitest_1.expect)(qMock.mock.calls.find(([sql]) => re.updateUserMovie.test(String(sql)))).toBeUndefined();
    });
    (0, vitest_1.it)("updates provided fields", async () => {
        const res = await (0, supertest_1.default)(__1.app).patch("/api/my/movies").send({
            username: "nikita",
            Title: "Matrix",
            Year: "1999",
            Runtime: "136",
            Genre: "Action, Sci-Fi",
            Director: "Wachowski",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({ ok: true });
        // ensure UPDATE executed with dynamic parts
        const updateCall = qMock.mock.calls.find(([sql]) => re.updateUserMovie.test(String(sql)));
        (0, vitest_1.expect)(updateCall).toBeTruthy();
        const [sql, params] = updateCall;
        (0, vitest_1.expect)(String(sql)).toMatch(/SET .*updated_at=now\(\)/i);
        (0, vitest_1.expect)(params[0]).toBe("nikita");
        (0, vitest_1.expect)(params[1]).toBe("Matrix");
    });
});
(0, vitest_1.describe)("DELETE /api/my/movies", () => {
    (0, vitest_1.it)("400s when Title missing", async () => {
        const res = await (0, supertest_1.default)(__1.app).delete("/api/my/movies?username=nikita");
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body).toHaveProperty("error");
    });
    (0, vitest_1.it)("deletes the movie", async () => {
        const res = await (0, supertest_1.default)(__1.app).delete("/api/my/movies?username=nikita&Title=Matrix");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({ ok: true });
        // DELETE call params
        const delCall = qMock.mock.calls.find(([sql]) => re.deleteUserMovie.test(String(sql)));
        (0, vitest_1.expect)(delCall).toBeTruthy();
        const [, params] = delCall;
        (0, vitest_1.expect)(params).toEqual(["nikita", "Matrix"]);
    });
});
(0, vitest_1.describe)("PATCH /api/my/movies/favourite", () => {
    (0, vitest_1.it)("400s when Title missing", async () => {
        const res = await (0, supertest_1.default)(__1.app).patch("/api/my/movies/favourite").send({
            username: "nikita",
            Favourite: true,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body).toHaveProperty("error");
    });
    (0, vitest_1.it)("updates Favourite flag", async () => {
        const res = await (0, supertest_1.default)(__1.app).patch("/api/my/movies/favourite").send({
            username: "nikita",
            Title: "Matrix",
            Favourite: true,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({ ok: true });
        const favCall = qMock.mock.calls.find(([sql]) => re.updateUserMovie.test(String(sql)));
        (0, vitest_1.expect)(favCall).toBeTruthy();
        const [, params] = favCall;
        (0, vitest_1.expect)(params).toEqual(["nikita", "Matrix", true]);
    });
});
//# sourceMappingURL=myMovies.routes.test.js.map