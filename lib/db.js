import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const globalForDb = globalThis;

// Remove unsupported query parameters from DATABASE_URL
// The 'schema' parameter was used by Prisma but is not supported by postgres.js
function cleanDatabaseUrl(url) {
  if (!url) return url;
  const urlObj = new URL(url);
  urlObj.searchParams.delete("schema");
  return urlObj.toString();
}

// Create postgres client
const client = globalForDb.postgresClient || postgres(cleanDatabaseUrl(process.env.DATABASE_URL));

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export { schema };
