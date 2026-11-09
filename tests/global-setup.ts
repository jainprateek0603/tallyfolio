import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Dedicated to the test suite (see README) and gitignored. Never point this at dev.db.
const TEST_DB = fileURLToPath(new URL("../prisma/test.db", import.meta.url));

/** Starts integration tests from an empty database built from the current schema. */
export default function setup() {
  for (const suffix of ["", "-journal"]) rmSync(TEST_DB + suffix, { force: true });
  execSync("npx prisma db push --skip-generate", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
