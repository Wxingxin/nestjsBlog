const { UNAUTHORIZED } = require('../constants/errorCodes');
const { findUserById, toPublicUser } = require('./_store');

function createError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
 
async function getProfile(user) {
  if (!user || !user.id) {
    throw createError('Unauthorized', 401, UNAUTHORIZED);
  }
  const record = findUserById(user.id);
  if (!record) {
    throw createError('User not found', 404);
  }
  return toPublicUser(record);
}

module.exports = { getProfile };
