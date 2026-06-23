// Migration runner with a tracking table, so `npm run migrate` is safe to
// run repeatedly: each file in src/db/migrations/ runs at most once, in
// filename order, inside its own transaction. Run with:
//   npm run migrate        (migrations only)
//   npm run migrate:seed   (migrations, then seed.sql)
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '../src/db/migrations');

async function run() {
  const includeSeed = process.argv.includes('--seed');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const appliedResult = await pool.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((r) => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] Skipping ${file} (already applied)`);
        continue;
      }
      console.log(`[migrate] Applying ${file} ...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        appliedCount += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      } finally {
        client.release();
      }
    }
    console.log(`[migrate] Done. ${appliedCount} migration(s) applied, ${files.length - appliedCount} already up to date.`);

    if (includeSeed) {
      const seedSql = fs.readFileSync(path.join(__dirname, '../src/db/seed.sql'), 'utf8');
      console.log('[migrate] Applying seed.sql ...');
      await pool.query(seedSql);
      console.log('[migrate] Seed data applied.');
    }
  } catch (err) {
    console.error('[migrate] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
