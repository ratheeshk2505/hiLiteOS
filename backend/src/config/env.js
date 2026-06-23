// Centralizes env var access so the rest of the app never touches
// process.env directly — makes it obvious what config the app needs,
// and fails fast on boot instead of failing deep inside a request.
require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`[config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET,
  // Access tokens are short-lived on purpose — a stolen one is only useful
  // for a few minutes. Long-lived sessions are carried by the refresh
  // token instead, which is revocable server-side (the access token isn't).
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresInDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '30', 10),

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Set this in any environment running more than one API instance behind
  // a load balancer — it backs the rate limiter with a shared store so
  // limits are enforced across all instances instead of per-process.
  // Without it, rate limiting still works but only within a single process,
  // which is fine for local dev but not for a scaled-out deployment.
  redisUrl: process.env.REDIS_URL || null,

  // Pool sizing is per-process: with N app instances each holding up to
  // this many connections, total connections to Postgres can reach N×this.
  // Neon's pooled connection string (PgBouncer) absorbs that fan-out, but
  // keep this modest per instance regardless — a handful of idle
  // connections per process is enough for typical request concurrency,
  // and a runaway value just exhausts the upstream pooler under load.
  dbPoolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  dbStatementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '10000', 10),

  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '25', 10),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
};
