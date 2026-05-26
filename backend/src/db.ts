import fs from "fs";
import path from "path";
import { Pool, QueryResultRow } from "pg";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
}

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
});

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

export async function runMigration() {
  const migrationDir = path.join(process.cwd(), "db", "migrations");
  const migrationFiles = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
    await pool.query(sql);
  }
}
