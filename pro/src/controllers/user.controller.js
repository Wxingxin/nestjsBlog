const userService = require('../services/user.service');

async function getProfile(req, res, next) {
  try {
    // req.user is populated by auth middleware
    const result = await userService.getProfile(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile };
