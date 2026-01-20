const { FORBIDDEN } = require('../constants/errorCodes');

const buckets = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

function createError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function rateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }

  entry.count += 1;
  buckets.set(key, entry);

  if (entry.count > MAX_REQUESTS) {
    return next(createError('Too many requests', 429, FORBIDDEN));
  }

  return next();
}

module.exports = { rateLimit };
