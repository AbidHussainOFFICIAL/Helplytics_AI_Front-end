const express = require('express');
const router = express.Router();

const {
  createOrGetChat,
  sendMessage,
  getMessages,
  getUserChats,
  getChatUsers,
  getMessagesWithUser,
  sendMessageToUser,
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

// Get all user chats
router.get('/', protect, getUserChats);

// Get users that current user has chatted with
router.get('/users', protect, getChatUsers);

// Get messages with a specific user
router.get('/user/:userId/messages', protect, getMessagesWithUser);

// Send message to a specific user
router.post('/user/:userId/message', protect, validate(sendMessageSchema), sendMessageToUser);

module.exports = router;