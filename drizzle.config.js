import { defineConfig } from "drizzle-kit";

// Remove unsupported query parameters from DATABASE_URL
// The 'schema' parameter was used by Prisma but is not supported by postgres.js
function cleanDatabaseUrl(url) {
  if (!url) return url;
  const urlObj = new URL(url);
  urlObj.searchParams.delete("schema");
  return urlObj.toString();
}

export default defineConfig({
  schema: "./lib/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: cleanDatabaseUrl(process.env.DATABASE_URL),
  },
});
