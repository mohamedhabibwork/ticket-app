import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:@localhost:5432/ticket",
});

async function getAppliedMigrations() {
  const result = await pool.query('SELECT hash FROM "__drizzle_migrations"');
  return result.rows.map((r) => r.hash);
}

async function markMigrationApplied(hash: string, createdAt: number) {
  await pool.query(
    'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [hash, createdAt],
  );
}

async function runMigrations() {
  const migrationsDir = "./src/migrations";
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = await getAppliedMigrations();
  console.log(`Found ${applied.length} applied migrations`);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    const hash = file.replace(".sql", "").replace(/^\d+_/, "");

    if (applied.includes(hash)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`Applying ${file}...`);
    const statements = sql.split("--> statement-breakpoint");

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      try {
        await pool.query(trimmed);
      } catch (e: any) {
        if (e.message?.includes("already exists") || e.message?.includes("does not exist")) {
          continue;
        }
        console.error(`Error: ${e.message}`);
      }
    }

    await markMigrationApplied(hash, Date.now());
    console.log(`Applied ${file}`);
  }

  console.log("Migrations complete");
  await pool.end();
}

runMigrations().catch(console.error);
