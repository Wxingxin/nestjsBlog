const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'replace_me',
  jwtExpire: process.env.JWT_EXPIRE || '1d',
};

module.exports = env;
