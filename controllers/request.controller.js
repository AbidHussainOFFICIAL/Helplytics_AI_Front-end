const Request = require('../models/Request');
const User = require('../models/User');

// @desc Create request
exports.createRequest = async (req, res, next) => {
  try {
    if (!['need_help', 'both'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only users who need help can create requests',
      });
    }

    const request = await Request.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      request,
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all requests (filterable)
exports.getRequests = async (req, res, next) => {
  try {
    const { category, urgency, status } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (urgency) filter.urgency = urgency;
    if (status) filter.status = status;

    const requests = await Request.find(filter)
      .populate('createdBy', 'name role')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (err) {
    next(err);
  }
};

// @desc I can help
exports.canHelp = async (req, res, next) => {
  try {
    // allow can_help + both
    if (!['can_help', 'both'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only helpers can respond to requests',
      });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    // prevent self-help (AFTER fetching request)
    if (request.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot help your own request',
      });
    }

    // prevent duplicate help
    if (request.helpers.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Already helping',
      });
    }

    request.helpers.push(req.user._id);
    request.status = 'in_progress';

    await request.save();

    res.status(200).json({
      success: true,
      message: 'You are now helping',
    });
  } catch (err) {
    next(err);
  }
};

// @desc Mark as completed
exports.markCompleted = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // only creator can mark complete
    if (request.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only creator can mark as completed',
      });
    }

    request.status = 'completed';
    request.completedBy = req.user._id;
    request.completedAt = Date.now();

    await request.save();

    // increase trust score of helpers
await User.updateMany(
  { _id: { $in: request.helpers } },
  { $inc: { trustScore: 5, contributions: 1 } }
);

    res.status(200).json({
      success: true,
      message: 'Request marked as completed',
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get single request
exports.getRequestById = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('createdBy', 'name role')
      .populate('helpers', 'name role');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    res.status(200).json({
      success: true,
      request,
    });
  } catch (err) {
    next(err);
  }
};

// @desc Update request
exports.updateRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    // only creator
    if (request.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this request',
      });
    }

    // cannot update completed
    if (request.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed request',
      });
    }

    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      request: updated,
    });
  } catch (err) {
    next(err);
  }
};


// @desc Delete request
exports.deleteRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    if (request.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this request',
      });
    }

    await request.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Request deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};