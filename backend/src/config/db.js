// Single pg Pool shared across the app. Neon is serverless Postgres reached
// over a normal TLS connection, so the standard `pg` driver works fine here —
// no need for the edge-only @neondatabase/serverless client since this is a
// long-running Node server, not a request-per-invocation edge function.
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL; Neon's cert chain is trusted but this keeps local dev simple
  max: env.dbPoolMax,
  idleTimeoutMillis: 30000,
  // Caps how long a single query can hold a connection. Without this, one
  // slow/runaway query under load can pin a connection indefinitely and
  // starve the rest of the pool — a real risk once concurrent traffic
  // grows past what fits comfortably in `max`.
  statement_timeout: env.dbStatementTimeoutMs,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] Unexpected error on idle Postgres client', err);
});

// Lightweight pool occupancy logging — cheap now, and the first thing
// you'll want when diagnosing "requests are slow" under real load, since
// it tells you whether the bottleneck is Postgres itself or just waiting
// on a connection from an undersized pool.
if (env.nodeEnv === 'development') {
  setInterval(() => {
    if (pool.waitingCount > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[db] Pool pressure: ${pool.waitingCount} request(s) waiting for a connection (total=${pool.totalCount}, idle=${pool.idleCount})`);
    }
  }, 10000);
}

/**
 * Run a single query. Prefer this for one-off statements.
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (env.nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[db] ${text.split('\n')[0].trim()} (${Date.now() - start}ms, ${result.rowCount} rows)`);
  }
  return result;
}

/**
 * Run a callback inside a transaction. Use whenever an operation touches
 * more than one table and must succeed or fail atomically — e.g. creating
 * an organization, seeding its module flags, and creating its first admin
 * user all need to happen together or not at all.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
