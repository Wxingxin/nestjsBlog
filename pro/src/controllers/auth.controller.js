const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    // Delegate to service for auth validation and token issuing
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    // Delegate to service for user creation
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register };
