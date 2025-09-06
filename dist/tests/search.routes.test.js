"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const __1 = require("..");
const vitest_1 = require("vitest");
const { qMock } = vitest_1.vi.hoisted(() => ({ qMock: vitest_1.vi.fn() }));
const axiosGet = axios_1.default.get;
vitest_1.vi.mock("@/utils/db", () => ({ q: qMock }));
vitest_1.vi.mock("axios", () => ({ default: { get: vitest_1.vi.fn() } }));
vitest_1.vi.mock("pg", () => ({
    Pool: vitest_1.vi.fn(() => ({ query: vitest_1.vi.fn(), end: vitest_1.vi.fn() })),
}));
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
    qMock.mockReset();
    qMock.mockImplementation(async (sql) => {
        // 1) ensureUser()
        if (/^\s*INSERT\s+INTO\s+users\b/i.test(sql))
            return;
        // 2) upsert rows during /save
        if (/^\s*INSERT\s+INTO\s+user_movies\b/i.test(sql))
            return;
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
const errSpy = vitest_1.vi.spyOn(console, "error").mockImplementation(() => { });
(0, vitest_1.describe)("GET /api/search/save", () => {
    (0, vitest_1.it)("saves results and returns from DB", async () => {
        const res = await (await Promise.resolve().then(() => __importStar(require("supertest"))))
            .default(__1.app)
            .get("/api/search/save?q=film&username=nikita");
        if (res.status !== 200) {
            console.error("DEBUG status/body:", res.status, res.body);
        }
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.movies).toHaveLength(2);
        (0, vitest_1.expect)(qMock).toHaveBeenCalled();
        (0, vitest_1.expect)(axiosGet).toHaveBeenCalledTimes(3);
    });
});
(0, vitest_1.afterAll)(() => errSpy.mockRestore());
//# sourceMappingURL=search.routes.test.js.map