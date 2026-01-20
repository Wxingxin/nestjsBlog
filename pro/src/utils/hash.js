async function hashPassword(value) {
  // TODO: implement bcrypt hash
  return `hash:${value}`;
}

async function comparePassword(value, hashed) {
  // TODO: implement bcrypt compare
  return hashed === `hash:${value}`;
}

module.exports = { hashPassword, comparePassword };
