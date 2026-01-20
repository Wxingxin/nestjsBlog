const { jwtSecret, jwtExpire } = require('../config/jwt');

function signToken(payload) {
  // TODO: use jwt.sign
  return `${payload.id}.${jwtSecret}.${jwtExpire}`;
}

module.exports = { signToken };
