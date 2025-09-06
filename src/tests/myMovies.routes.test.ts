import { vi, describe, it, expect, beforeEach } from "vitest";
const { qMock } = vi.hoisted(() => ({ qMock: vi.fn() }));

vi.mock("@/utils/db", () => ({ q: qMock }));
vi.mock("pg", () => ({
  Pool: vi.fn(() => ({ query: vi.fn(), end: vi.fn() })),
}));

import { app } from "..";
import request from "supertest";

const re = {
  insertUser: /^\s*INSERT\s+INTO\s+users\b/i,
  selectAllForUser:
    /^\s*SELECT\s+username\b.*\bFROM\s+user_movies\b[\s\S]*WHERE\s+username\s*=\s*\$1\b/i,
  upsertUserMovie: /^\s*INSERT\s+INTO\s+user_movies\b/i,
  updateUserMovie: /^\s*UPDATE\s+user_movies\b/i,
  deleteUserMovie: /^\s*DELETE\s+FROM\s+user_movies\b/i,
};

beforeEach(() => {
  vi.clearAllMocks();
  qMock.mockReset();

  qMock.mockImplementation(async (sql: string, params?: any[]) => {
    const s = String(sql);

    // ensureUser()
    if (/^\s*INSERT\s+INTO\s+users\b/i.test(s)) return;

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
    if (/^\s*INSERT\s+INTO\s+user_movies\b/i.test(s)) return;

    // PATCH update (both general and /favourite)
    if (/^\s*UPDATE\s+user_movies\b/i.test(s)) return;

    // DELETE
    if (/^\s*DELETE\s+FROM\s+user_movies\b/i.test(s)) return;

    throw new Error("Unexpected SQL in test");
  });
});


describe("GET /api/my/movies", () => {
  it("returns movies for user", async () => {
    const res = await request(app).get("/api/my/movies?username=nikita");
    expect(res.status).toBe(200);
    expect(res.body.movies).toHaveLength(2);
    // ensure ensureUser() was called first
    expect(qMock).toHaveBeenCalledWith(expect.stringMatching(re.insertUser), [
      "nikita",
    ]);
  });
});

describe("POST /api/my/movies", () => {
  it("400s when Title or Year missing", async () => {
    const res = await request(app).post("/api/my/movies").send({
      username: "nikita",
      // Title missing
      Year: "2000",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("upserts and returns ok: true", async () => {
    const res = await request(app).post("/api/my/movies").send({
      username: "nikita",
      Title: "Matrix",
      Year: "1999",
      Runtime: "136",
      Genre: "Action, Sci-Fi",
      Director: "Wachowski",
      Favourite: true,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // ensure ensureUser insert happened
    expect(qMock).toHaveBeenCalledWith(expect.stringMatching(re.insertUser), [
      "nikita",
    ]);

    // ensure upsert happened
    expect(qMock).toHaveBeenCalledWith(
      expect.stringMatching(re.upsertUserMovie),
      ["nikita", "Matrix", "1999", "136", "Action, Sci-Fi", "Wachowski", true]
    );
  });
});

describe("PATCH /api/my/movies", () => {
  it("400s when Title missing", async () => {
    const res = await request(app).patch("/api/my/movies").send({
      username: "nikita",
      // Title missing
      Year: "2000",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("no-op when no fields provided", async () => {
    const res = await request(app).patch("/api/my/movies").send({
      username: "nikita",
      Title: "Matrix",
      // no fields to update
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // ensure no UPDATE executed
    expect(
      qMock.mock.calls.find(([sql]) => re.updateUserMovie.test(String(sql)))
    ).toBeUndefined();
  });

  it("updates provided fields", async () => {
    const res = await request(app).patch("/api/my/movies").send({
      username: "nikita",
      Title: "Matrix",
      Year: "1999",
      Runtime: "136",
      Genre: "Action, Sci-Fi",
      Director: "Wachowski",
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // ensure UPDATE executed with dynamic parts
    const updateCall = qMock.mock.calls.find(([sql]) =>
      re.updateUserMovie.test(String(sql))
    );
    expect(updateCall).toBeTruthy();
    const [sql, params] = updateCall!;
    expect(String(sql)).toMatch(/SET .*updated_at=now\(\)/i);
    expect(params[0]).toBe("nikita");
    expect(params[1]).toBe("Matrix");
  });
});

describe("DELETE /api/my/movies", () => {
  it("400s when Title missing", async () => {
    const res = await request(app).delete("/api/my/movies?username=nikita");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("deletes the movie", async () => {
    const res = await request(app).delete(
      "/api/my/movies?username=nikita&Title=Matrix"
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // DELETE call params
    const delCall = qMock.mock.calls.find(([sql]) =>
      re.deleteUserMovie.test(String(sql))
    );
    expect(delCall).toBeTruthy();
    const [, params] = delCall!;
    expect(params).toEqual(["nikita", "Matrix"]);
  });
});

describe("PATCH /api/my/movies/favourite", () => {
  it("400s when Title missing", async () => {
    const res = await request(app).patch("/api/my/movies/favourite").send({
      username: "nikita",
      Favourite: true,
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("updates Favourite flag", async () => {
    const res = await request(app).patch("/api/my/movies/favourite").send({
      username: "nikita",
      Title: "Matrix",
      Favourite: true,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const favCall = qMock.mock.calls.find(([sql]) =>
      re.updateUserMovie.test(String(sql))
    );
    expect(favCall).toBeTruthy();
    const [, params] = favCall!;
    expect(params).toEqual(["nikita", "Matrix", true]);
  });
});
