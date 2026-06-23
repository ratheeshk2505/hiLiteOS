const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * express-rate-limit's default store is in-process memory, which only
 * tracks requests seen by *that one process*. Run more than one API
 * instance behind a load balancer (the normal way to handle heavy load)
 * and each instance enforces its own separate limit — a client could get
 * N× the intended allowance just by landing on different instances. If
 * REDIS_URL is set, every instance shares counts through Redis instead,
 * so the limit is enforced globally regardless of how many instances are
 * running. Without it, this still protects a single-instance deployment
 * (and local dev), just not a horizontally-scaled one.
 */
function buildStore(prefix) {
  if (!env.redisUrl) return undefined; // express-rate-limit's default MemoryStore

  // Lazy-require so environments without Redis configured never pay for
  // loading ioredis at all.
  // eslint-disable-next-line global-require
  const Redis = require('ioredis');
  // eslint-disable-next-line global-require
  const { RedisStore } = require('rate-limit-redis');

  const client = new Redis(env.redisUrl);
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args) => client.call(...args),
  });
}

// Generous global ceiling — this is a backstop against abuse/scraping, not
// a throttle on normal usage. Authenticated, legitimate traffic shouldn't
// ever come close to it.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('api'),
});

// Login endpoints get a much tighter limit, keyed by IP, specifically to
// slow down credential-stuffing / brute-force attempts against a known
// email. This is independent of any account-lockout logic — it caps
// attempts regardless of which account is being targeted.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('login'),
  message: { success: false, error: { message: 'Too many login attempts. Please try again in a few minutes.' } },
});

module.exports = { apiLimiter, loginLimiter };
