require('dotenv').config();

/**
 * AUTH CONFIGURATION
 */

module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },

  // Cookie Configuration
  cookie: {
    expires: process.env.COOKIE_EXPIRE || 7, // days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
    sameSite: 'strict',
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000, // 10 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000, // limit each IP
    message: 'Too many requests from this IP, please try again later.',
  },

  // Password Configuration
  password: {
    minLength: 6,
    saltRounds: 10,
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
  },
};