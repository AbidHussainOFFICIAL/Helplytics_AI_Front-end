const express = require('express');
const router = express.Router();

const {
  createOrGetChat,
  sendMessage,
  getMessages,
} = require('../controllers/chat.controller');

const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const { sendMessageSchema } = require('../validators/chat.validator');

// Create or open chat for a request
router.post('/request/:requestId', protect, createOrGetChat);

// Send message
router.post('/:chatId/message', protect, validate(sendMessageSchema), sendMessage);

// Get messages
router.get('/:chatId/messages', protect, getMessages);

module.exports = router;