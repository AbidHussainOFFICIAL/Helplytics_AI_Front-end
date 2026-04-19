const express = require('express');
const router = express.Router();

const {
  getLeaderboard,
  getTopHelpers,
  getUserRank,
  getStats,
} = require('../controllers/leaderboard.controller');

const { protect } = require('../middlewares/auth.middleware');

// leaderboard
router.get('/', protect, getLeaderboard);

// top helpers
router.get('/helpers', protect, getTopHelpers);

// stats
router.get('/stats', protect, getStats);

// user rank
router.get('/:userId', protect, getUserRank);

module.exports = router;