const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Request = require('../models/Request');

// Create or get chat
exports.createOrGetChat = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // check permission
    const isParticipant =
      request.createdBy.toString() === req.user._id.toString() ||
      request.helpers.includes(req.user._id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to access this chat',
      });
    }

    let chat = await Chat.findOne({ request: request._id });

    if (!chat) {
      chat = await Chat.create({
        request: request._id,
        participants: [request.createdBy, ...request.helpers],
      });
    }

    res.status(200).json({
      success: true,
      chat,
    });
  } catch (err) {
    next(err);
  }
};

// Send message
exports.sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed',
      });
    }

    const message = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      text,
    });

    res.status(201).json({
      success: true,
      message,
    });
  } catch (err) {
    next(err);
  }
};

// Get messages
exports.getMessages = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed',
      });
    }

    const messages = await Message.find({ chat: chat._id })
      .populate('sender', 'name')
      .sort('createdAt');

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (err) {
    next(err);
  }
};

// Get user chats
exports.getUserChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .populate('request', 'title category status')
      .populate('participants', 'name role')
      .sort('-updatedAt');

    res.status(200).json({
      success: true,
      chats,
    });
  } catch (err) {
    next(err);
  }
};