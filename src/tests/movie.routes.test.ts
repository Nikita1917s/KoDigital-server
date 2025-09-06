import { vi, describe, it, expect, beforeEach } from "vitest";
const { qMock } = vi.hoisted(() => ({ qMock: vi.fn() }));

vi.mock("@/utils/db", () => ({ q: qMock }));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("pg", () => ({
  Pool: vi.fn(() => ({ query: vi.fn(), end: vi.fn() })),
}));

import request from "supertest";
import { app } from "..";
import axios from "axios";

const axiosGet = (axios as any).get as ReturnType<typeof vi.fn>;
const selectOneForUser =
  /^\s*SELECT[\s\S]*FROM\s+user_movies[\s\S]*WHERE[\s\S]*username\s*=\s*\$1[\s\S]*"Title"\s+ILIKE\s+\$2[\s\S]*LIMIT\s+1/i;

beforeEach(() => {
  vi.clearAllMocks();
  qMock.mockReset();
  axiosGet.mockReset();

  qMock.mockImplementation(async (sql: string) => {
    if (/\bSELECT\b[\s\S]*\bFROM\s+user_movies\b/i.test(String(sql))) {
      return { rows: [] };
    }
    return undefined;
  });
});

describe("GET /api/movie", () => {
  it("400 when title missing", async () => {
    const res = await request(app).get("/api/movie?username=nikita");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Title is required");
    expect(axiosGet).not.toHaveBeenCalled();
    expect(qMock).not.toHaveBeenCalled();
  });

  it("returns from DB when username provided and row exists", async () => {
    // Return a row for the first SELECT call
    qMock.mockImplementationOnce(async (sql: string, params: any[]) => {
      expect(String(sql)).toMatch(selectOneForUser);
      expect(params).toEqual(["nikita", "Matrix"]);
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

    const res = await request(app).get(
      "/api/movie?username=nikita&title=Matrix"
    );
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("db");
    expect(res.body.movie).toEqual({
      username: "nikita",
      Title: "Matrix",
      Year: "1999",
      Runtime: "136",
      Genre: "Action, Sci-Fi",
      Director: "Wachowski",
      Favourite: true,
    });
    expect(qMock).toHaveBeenCalledTimes(1);
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it("falls back to OMDB when no DB row and OMDB returns True", async () => {

    qMock.mockImplementationOnce(async (sql: string, params: any[]) => {
      expect(String(sql)).toMatch(selectOneForUser);
      expect(params).toEqual(["nikita", "Matrix"]);
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

    const res = await request(app).get(
      "/api/movie?username=nikita&title=Matrix"
    );
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("omdb");
    expect(res.body.movie).toEqual({
      Title: "The Matrix",
      Year: "1999",
      Runtime: "136 min",
      Genre: "Action, Sci-Fi",
      Director: "Lana Wachowski, Lilly Wachowski",
      Favourite: false,
    });

    expect(qMock).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledTimes(1);
    const [url, opts] = axiosGet.mock.calls[0];
    expect(typeof url).toBe("string");
    expect(opts).toMatchObject({
      params: expect.objectContaining({ t: "Matrix", type: "movie" }),
    });
  });

  it("returns 404 when OMDB says not found", async () => {

    axiosGet.mockResolvedValueOnce({
      data: { Response: "False", Error: "Movie not found!" },
    });

    const res = await request(app).get(
      "/api/movie?username=nikita&title=Nonexistent"
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Movie not found" });
    expect(qMock).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledTimes(1);
  });

  it("without username, queries OMDB directly", async () => {
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

    const res = await request(app).get("/api/movie?title=Inception");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("omdb");
    expect(res.body.movie).toEqual({
      Title: "Inception",
      Year: "2010",
      Runtime: "148 min",
      Genre: "Action, Adventure, Sci-Fi",
      Director: "Christopher Nolan",
      Favourite: false,
    });
    expect(qMock).not.toHaveBeenCalled();
    expect(axiosGet).toHaveBeenCalledTimes(1);
  });
});
