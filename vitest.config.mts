import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Relative to prisma/, so this is prisma/test.db. Unit tests never open it.
    env: { DATABASE_URL: "file:./test.db", AUTH_RATE_LIMIT: "1000" },
    globalSetup: ["tests/global-setup.ts"],
    // Integration files share one SQLite file; run files one at a time.
    fileParallelism: false,
  },
});
