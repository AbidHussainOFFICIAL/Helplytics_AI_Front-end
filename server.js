const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const config = require('./config/auth.config');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');

/**
 * EXPRESS SERVER SETUP
 * 
 * This is the main server file. Minimal configuration required.
 */

const app = express();

// Trust proxy for Render/Vercel (important for rate limiting)
app.set('trust proxy', 1);

// 1. CONNECT TO DATABASE FIRST
connectDB();

// 2. MIDDLEWARES
// ===========================
// MIDDLEWARES
// ===========================

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// CORS - Configure based on your frontend URL
const allowedOrigins = [
  'http://localhost:3000',
  'https://helplytics-ai-frontend-one.vercel.app',
  process.env.CLIENT_URL?.replace(/\/$/, '') // Remove trailing slash if present
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies
}));

// Rate limiting (apply to all routes except AI)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/ai')) {
    return next();
  }
  apiLimiter(req, res, next);
});

// 3. ROUTES
// ===========================
// ROUTES
// ===========================

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is running',
  });
});

// Auth routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/requests', require('./routes/request.routes'));
app.use('/api/account', require('./routes/user.account.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));

// Example: Protected route
const { protect } = require('./middlewares/auth.middleware');
app.get('/api/protected', protect, (req, res) => {
  res.json({
    success: true,
    message: 'You have access to this protected route',
    user: req.user,
  });
});

// ===========================
// ERROR HANDLING
// ===========================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ===========================
// START SERVER
// ===========================

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.server.env} mode`);
  console.log(`API URL: http://localhost:${PORT}`);
});