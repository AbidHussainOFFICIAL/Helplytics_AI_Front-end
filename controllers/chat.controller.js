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

    // Create notifications for other participants
    try {
      const Notification = require('../models/Notification');
      const otherParticipants = chat.participants.filter(p => p.toString() !== req.user._id.toString());

      for (const participantId of otherParticipants) {
        await Notification.create({
          recipient: participantId,
          sender: req.user._id,
          type: 'system',
          title: 'New message',
          message: `${req.user.name} sent you a message`,
          relatedId: chat._id
        });
      }
    } catch (nErr) {
      console.error("Failed to create message notifications", nErr);
    }

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

// Get users that the current user has chatted with
exports.getChatUsers = async (req, res, next) => {
  try {
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: req.user._id,
    }).populate('participants', 'name email role');

    // Extract unique users from chats
    const userMap = new Map();

    chats.forEach(chat => {
      chat.participants.forEach(participant => {
        if (participant._id.toString() !== req.user._id.toString()) {
          // Find the most recent message in this chat
          const chatId = chat._id;
          // We'll get the last message separately
          userMap.set(participant._id.toString(), {
            _id: participant._id,
            name: participant.name,
            email: participant.email,
            role: participant.role,
            chatId: chatId,
            // lastMessage will be set below
          });
        }
      });
    });

    // Get the most recent message for each user
    const userIds = Array.from(userMap.keys());
    if (userIds.length > 0) {
      for (const userId of userIds) {
        const lastMessage = await Message.findOne({
          chat: { $in: chats.map(c => c._id) },
          $or: [
            { sender: req.user._id },
            { sender: userId }
          ]
        }).sort('-createdAt').populate('sender', 'name');

        if (lastMessage) {
          userMap.get(userId).lastMessage = lastMessage.createdAt;
          userMap.get(userId).lastMessageText = lastMessage.text;
        }
      }
    }

    const users = Array.from(userMap.values())
      .filter(user => user.lastMessage) // Only include users with messages
      .sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));

    res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    next(err);
  }
};

// Get all messages between current user and a specific user
exports.getMessagesWithUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;

    // Find all chats where both users are participants
    const chats = await Chat.find({
      participants: { $all: [req.user._id, targetUserId] }
    });

    if (chats.length === 0) {
      return res.status(200).json({
        success: true,
        messages: [],
        user: null
      });
    }

    // Get all messages from these chats
    const messages = await Message.find({
      chat: { $in: chats.map(chat => chat._id) }
    })
    .populate('sender', 'name email role')
    .sort('createdAt');

    // Get target user info
    const User = require('../models/User');
    const targetUser = await User.findById(targetUserId).select('name email role');

    res.status(200).json({
      success: true,
      messages,
      user: targetUser
    });
  } catch (err) {
    next(err);
  }
};

// Send message to a specific user (create chat if doesn't exist)
exports.sendMessageToUser = async (req, res, next) => {
  try {
    const { text } = req.body;
    const targetUserId = req.params.userId;

    // Find existing chat between the two users
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, targetUserId], $size: 2 }
    });

    // If no direct chat exists, create one
    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, targetUserId],
        // No request associated for direct user-to-user messaging
      });
    }

    // Create the message
    const message = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      text
    });

    res.status(200).json({
      success: true,
      message: await message.populate('sender', 'name email role')
    });
  } catch (err) {
    next(err);
  }
};