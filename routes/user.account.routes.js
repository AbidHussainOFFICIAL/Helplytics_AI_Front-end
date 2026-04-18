const express = require('express');
const router = express.Router();

const {
  getMe,
  updateProfile,
  updatePassword,
} = require('../controllers/user.account.controller');

const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { passwordChangeSchema } = require('../validators/auth.validator');

// Protected user account routes
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/update-password', protect, validate(passwordChangeSchema), updatePassword);

module.exports = router;