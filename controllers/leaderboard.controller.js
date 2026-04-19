const User = require('../models/User');
const Request = require('../models/Request');

// @desc Get leaderboard
// @route GET /api/leaderboard
exports.getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('name trustScore contributions badges')
      .sort({ trustScore: -1, contributions: -1 })
      .limit(20);

    // add ranking manually
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      ...user.toObject(),
    }));

    res.status(200).json({
      success: true,
      leaderboard,
    });
  } catch (err) {
    next(err);
  }
};

// @desc Top helpers (based on helping requests)
// @route GET /api/leaderboard/helpers
exports.getTopHelpers = async (req, res, next) => {
  try {
    const helpers = await Request.aggregate([
      { $unwind: '$helpers' },
      {
        $group: {
          _id: '$helpers',
          helpCount: { $sum: 1 },
        },
      },
      { $sort: { helpCount: -1 } },
      { $limit: 10 },
    ]);

    // populate user info
    const result = await User.populate(helpers, {
      path: '_id',
      select: 'name trustScore contributions',
    });

    res.status(200).json({
      success: true,
      helpers: result.map((h, i) => ({
        rank: i + 1,
        helpCount: h.helpCount,
        ...(h._id.toObject ? h._id.toObject() : h._id),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get community stats
// @route GET /api/leaderboard/stats
exports.getStats = async (req, res, next) => {
  try {
    const totalRequests = await Request.countDocuments();
    const totalSolutions = await Request.countDocuments({ status: 'completed' });
    const masterHelpers = await User.countDocuments({ trustScore: { $gt: 90 } });
    
    const successRate = totalRequests > 0 
      ? ((totalSolutions / totalRequests) * 100).toFixed(1) 
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalSolutions,
        successRate,
        masterHelpers,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get user rank
// @route GET /api/leaderboard/:userId
exports.getUserRank = async (req, res, next) => {
  try {
    const users = await User.find()
      .sort({ trustScore: -1, contributions: -1 })
      .select('_id');

    const index = users.findIndex(
      (u) => u._id.toString() === req.params.userId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found in leaderboard',
      });
    }

    res.status(200).json({
      success: true,
      rank: index + 1,
    });
  } catch (err) {
    next(err);
  }
};