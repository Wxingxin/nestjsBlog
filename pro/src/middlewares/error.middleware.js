const env = require('../config/env');

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    message: err.message || 'Unexpected error',
  };
  if (err.code) {
    payload.code = err.code;
  }
  if (env.nodeEnv === 'development' && err.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}

module.exports = { errorHandler };
