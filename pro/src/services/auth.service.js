const { UNAUTHORIZED, VALIDATION } = require('../constants/errorCodes');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken } = require('../utils/token');
const {
  createUser,
  findUserByEmail,
  toPublicUser,
} = require('./_store');

function createError(message, status, code = VALIDATION) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function login(payload) {
  const { email, password } = payload || {};
  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }
  const user = findUserByEmail(email);
  if (!user) {
    throw createError('Invalid credentials', 401, UNAUTHORIZED);
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    throw createError('Invalid credentials', 401, UNAUTHORIZED);
  }
  const token = signToken({ id: user.id });
  return { token, user: toPublicUser(user) };
}

async function register(payload) {
  const { email, password, name } = payload || {};
  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }
  const passwordHash = await hashPassword(password);
  const user = createUser({ email, passwordHash, name });
  const token = signToken({ id: user.id });
  return { token, user };
}

module.exports = { login, register };
