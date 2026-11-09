// Switches the Prisma datasource provider between sqlite and postgresql.
// Usage: node scripts/set-db-provider.mjs <sqlite|postgresql>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PROVIDERS = ["sqlite", "postgresql"];
const provider = process.argv[2];

if (!PROVIDERS.includes(provider)) {
  console.error(`Usage: node scripts/set-db-provider.mjs <${PROVIDERS.join("|")}>`);
  process.exit(1);
}

const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
const schema = readFileSync(schemaPath, "utf8");
const pattern = /(datasource db \{[^}]*?provider\s*=\s*")([a-z]+)(")/;
const match = pattern.exec(schema);

if (!match) {
  console.error("Could not find the datasource provider in prisma/schema.prisma.");
  process.exit(1);
}

if (match[2] === provider) {
  console.log(`Provider is already ${provider}.`);
} else {
  writeFileSync(schemaPath, schema.replace(pattern, `$1${provider}$3`));
  console.log(`Provider changed from ${match[2]} to ${provider}. Run \`npx prisma generate\`.`);
}
