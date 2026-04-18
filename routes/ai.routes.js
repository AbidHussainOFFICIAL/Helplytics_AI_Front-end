const express = require('express');
const router = express.Router();

const {
  getUserAI,
  getUserInsights,
  autoCategorize,
  rewriteRequest,
  getSummary,
  getResponseSuggestions,
  getTrends,
} = require('../controllers/ai.controller');

const { protect } = require('../middlewares/auth.middleware');

// USER AI
router.get('/user/suggestions', protect, getUserAI);
router.get('/user/insights', protect, getUserInsights);

// REQUEST AI
router.post('/request/categorize', protect, autoCategorize);
router.post('/request/rewrite', protect, rewriteRequest);
router.post('/request/summary', protect, getSummary);
router.post('/request/respond', protect, getResponseSuggestions);

// PLATFORM AI
router.get('/trends', protect, getTrends);

module.exports = router;