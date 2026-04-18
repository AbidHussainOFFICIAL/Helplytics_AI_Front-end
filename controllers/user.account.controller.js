const User = require('../models/User');
const { comparePassword } = require('../auth.utils');

// @desc    Get current logged in user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc Update profile (onboarding)
exports.updateProfile = async (req, res, next) => {
  try {
    const { role, skills, interests, location } = req.body;

    const user = await User.findById(req.user._id);

    const allowedRoles = ['need_help', 'can_help', 'both'];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    if (role) user.role = role;
    if (skills) user.skills = skills;
    if (interests) user.interests = interests;
    if (location) user.location = location;

    // mark onboarding complete
    user.isOnboarded = true;

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update Password
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Find the current user and explicitly select the password field
    const user = await User.findById(req.user._id).select('+password');

    // 2. Check if the current password provided matches the database password
    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // 3. Set the new password
    // Note: The UserSchema.pre('save') middleware we wrote earlier 
    // will automatically hash this new password for us.
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (err) {
    next(err);
  }
};