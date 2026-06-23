// Keeps every successful response in the same envelope shape so the
// frontend doesn't need per-endpoint parsing logic.
function ok(res, data, statusCode = 200, meta = undefined) {
  return res.status(statusCode).json({ success: true, data, ...(meta ? { meta } : {}) });
}

module.exports = { ok };
