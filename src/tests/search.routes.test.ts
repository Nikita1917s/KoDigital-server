import axios from "axios";
import { app } from "..";
import { vi, describe, it, expect, beforeEach, afterAll } from "vitest";

const { qMock } = vi.hoisted(() => ({ qMock: vi.fn() }));
const axiosGet = (axios as any).get as ReturnType<typeof vi.fn>;

vi.mock("@/utils/db", () => ({ q: qMock }));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("pg", () => ({
  Pool: vi.fn(() => ({ query: vi.fn(), end: vi.fn() })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  qMock.mockReset();

  qMock.mockImplementation(async (sql: string) => {
    // 1) ensureUser()
    if (/^\s*INSERT\s+INTO\s+users\b/i.test(sql)) return;

    // 2) upsert rows during /save
    if (/^\s*INSERT\s+INTO\s+user_movies\b/i.test(sql)) return;

    // 3) final SELECT for response
    if (/^\s*SELECT\s+username\b/i.test(sql)) {
      return {
        rows: [
          {
            username: "nikita",
            Title: "Film 1",
            Year: "2000",
            Runtime: "100",
            Genre: "Action",
            Director: "John",
            Favourite: false,
          },
          {
            username: "nikita",
            Title: "Film 2",
            Year: "2001",
            Runtime: "101",
            Genre: "Drama",
            Director: "Jane",
            Favourite: true,
          },
        ],
      };
    }

    throw new Error("Unexpected SQL in test: " + sql);
  });

  axiosGet.mockReset();
  axiosGet
    .mockResolvedValueOnce({
      data: {
        Response: "True",
        Search: [
          { Title: "Film 1", Year: "2000", imdbID: "tt1", Type: "movie" },
          { Title: "Film 2", Year: "2001", imdbID: "tt2", Type: "movie" },
        ],
      },
    })
    .mockResolvedValueOnce({
      data: {
        Title: "Film 1",
        Year: "2000",
        Runtime: "100",
        Genre: "Action",
        Director: "John",
      },
    })
    // details tt2
    .mockResolvedValueOnce({
      data: {
        Title: "Film 2",
        Year: "2001",
        Runtime: "101",
        Genre: "Drama",
        Director: "Jane",
      },
    });
});

const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("GET /api/search/save", () => {
  it("saves results and returns from DB", async () => {
    const res = await (await import("supertest"))
      .default(app)
      .get("/api/search/save?q=film&username=nikita");

    if (res.status !== 200) {
      console.error("DEBUG status/body:", res.status, res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.movies).toHaveLength(2);
    expect(qMock).toHaveBeenCalled();
    expect(axiosGet).toHaveBeenCalledTimes(3);
  });
});

afterAll(() => errSpy.mockRestore());
