const { jwtSecret, jwtExpire } = require('../config/jwt');
const { UNAUTHORIZED } = require('../constants/errorCodes');

function createError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function parseToken(raw) {
  const parts = (raw || '').split('.');
  if (parts.length !== 3) return null;
  const [userId, secret, expire] = parts;
  if (secret !== jwtSecret || expire !== jwtExpire) return null;
  return { id: userId };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = parseToken(token);
  if (!user) {
    return next(createError('Unauthorized', 401, UNAUTHORIZED));
  }
  req.user = user;
  return next();
}

module.exports = { requireAuth };
