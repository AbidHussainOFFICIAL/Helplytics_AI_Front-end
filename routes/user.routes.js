const express = require('express');
const router = express.Router();

const {
  getUserProfile,
  getUserStats,
  getRecentRequests,
} = require('../controllers/user.controller');

const { protect } = require('../middlewares/auth.middleware');

router.get('/requests/recent', protect, getRecentRequests);

router.get('/:id/stats', protect, getUserStats);
router.get('/:id', protect, getUserProfile);

module.exports = router;