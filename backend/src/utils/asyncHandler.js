// Wraps an async route handler so any rejected promise is forwarded to
// Express's error middleware via next(), instead of crashing the process
// or requiring a try/catch in every single controller function.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
