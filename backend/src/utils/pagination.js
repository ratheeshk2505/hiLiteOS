const env = require('../config/env');

/**
 * Normalizes page/pageSize query params into a safe { page, pageSize, offset }.
 * Caps pageSize so a client (or a bug) can't request an unbounded result
 * set — that's the single most common way a "list everything" endpoint
 * turns into a memory and network problem once a table has real volume,
 * e.g. leads once Module 3 is in everyday use.
 */
function parsePagination(query) {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.pageSize, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = env.defaultPageSize;
  if (pageSize > env.maxPageSize) pageSize = env.maxPageSize;

  return { page, pageSize, offset: (page - 1) * pageSize };
}

function buildMeta({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

module.exports = { parsePagination, buildMeta };
