import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    exclude: ["node_modules", "dist", ".idea", ".git", "output", "temp", "**/*.d.ts"],
  },
});