const User = require('../models/User');
const { comparePassword, sendTokenResponse } = require('../auth.utils');
const sendEmail = require('../utils/email');
const { verifyEmailTemplate, resetPasswordTemplate, forgotPasswordTemplate } = require('../utils/emailTemplates');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const { canRequestHelp, canProvideHelp } = require('../utils/permissions');


// @desc    Register user
// @route   POST /api/auth/signup
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
  let user = await User.findOne({ email });

  const allowedRoles = ['need_help', 'can_help', 'both'];

if (role && !allowedRoles.includes(role)) {
  return res.status(400).json({
    success: false,
    message: 'Invalid role selected',
  });
}

if (user && !user.isEmailVerified) {

    
      if (user.otpAttempts >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP attempts. Please try later.',
        });
      }

      user.name = name;
user.password = password;
if (role) user.role = role;

      //reset attempts when re-signing
      user.otpAttempts = 0;
    }

    else if (user && user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // New user
    else {
      user = new User({
  name,
  email,
  password,
  role: role || 'need_help',
});
    }

    let otp;
    try {
      otp = user.generateOTP('verify');
    } catch (error) {
      return res.status(429).json({
        success: false,
        message: error.message,
      });
    }

    //Save token fields 
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify Your OTP',
        message: verifyEmailTemplate(otp),
      });
    } catch (err) {
  user.clearOTP();
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent',
      });
    }

    //Response (NO TOKEN HERE)
    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // 1. Find user & include password field (since it's hidden by default in Schema)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

if (!user.isEmailVerified) {
  return res.status(403).json({
    success: false,
    message: 'Email not verified. Please verify OTP.',
    allowResend: true
  });
}

    //PASSWORD CHECK
    const isMatch = await comparePassword(password, user.password);


    if (!isMatch) {
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
}

    return sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};



// @route POST /api/auth/send-otp
exports.sendOTP = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const allowedPurposes = ['verify', 'reset'];

if (!allowedPurposes.includes(purpose)) {
  return res.status(400).json({
    success: false,
    message: 'Invalid OTP purpose',
  });
}

    // purpose: 'verify' | 'reset'

    let user = await User.findOne({ email });

    if (!user) {
  return res.status(200).json({
    success: true,
    message: 'If an account exists, OTP has been sent',
  });
}

if (purpose === 'verify' && user.isEmailVerified) {
  return res.status(400).json({
    success: false,
    message: 'Email already verified',
  });
}

    let otp;

try {
  otp = user.generateOTP(purpose);
    } catch (error) {
  return res.status(429).json({
    success: false,
    message: error.message,
  });
}

    await user.save({ validateBeforeSave: false });

    const message =
  purpose === 'verify'
    ? verifyEmailTemplate(otp)
    : resetPasswordTemplate(otp);

    const subjectMap = {
  verify: 'Verify Your Email Address',
  reset: 'Reset Your Password',
};

    try {
    await sendEmail({
  email: user.email,
  subject: subjectMap[purpose],
  message,
});
    } catch (err) {
  user.clearOTP();
  await user.save({ validateBeforeSave: false });

  return res.status(500).json({
    success: false,
    message: 'Email could not be sent',
  });
}

    res.status(200).json({
      success: true,
      message: 'OTP sent',
    });

  } catch (err) {
    next(err);
  }
};

// @route POST /api/auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose, password } = req.body;

    const allowedPurposes = ['verify', 'reset'];

if (!allowedPurposes.includes(purpose)) {
  return res.status(400).json({
    success: false,
    message: 'Invalid OTP purpose',
  });
}

  const user = await User.findOne({ email }).select('+password +otp.code');

if (!user) {
  return res.status(400).json({
    success: false,
    message: 'Invalid or expired OTP',
  });
}

const cleanOTP = otp?.trim();
const result = user.verifyOTP(cleanOTP, purpose);

if (!result.success) {
      await user.save(); // save attempts increment
      return res.status(400).json(result);
    }

if (purpose === 'verify') {
  user.isEmailVerified = true;

  user.clearOTP();
  await user.save();

    const token = jwt.sign(
    { id: user._id },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    token,      
    user,    
  });
}

    if (purpose === 'reset') {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required',
        });
      }

      user.password = password; // triggers passwordChangedAt
    }

    // clear OTP ONCE
    user.clearOTP();

    await user.save();

    if (purpose === 'reset') {
      return res.status(200).json({
        success: true,
        message: 'Password reset successful. Please login again.',
        forceLogout: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Security: don't reveal if user exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a reset email has been sent',
      });
    }

    // Generate OTP
    let otp;

try {
  otp = user.generateOTP('reset');
    } catch (error) {
  return res.status(429).json({
    success: false,
    message: error.message,
  });
}

    await user.save({ validateBeforeSave: false });

    const message = forgotPasswordTemplate(otp);

    try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset OTP',
      message,
    });
    } catch (err) {
  user.clearOTP();
  await user.save({ validateBeforeSave: false });

  return res.status(500).json({
    success: false,
    message: 'Email could not be sent',
  });
}

    res.status(200).json({
      success: true,
      message: 'OTP sent to email',
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ success: true, message: 'Logged out' });
};