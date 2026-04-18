const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },

  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ],
    index: true,
  },

  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },

  isEmailVerified: {
    type: Boolean,
    default: false,
  },

   role: {
    type: String,
    enum: ['need_help', 'can_help', 'both', 'admin'],
    default: 'need_help',
    required: true,
  },

  skills: [
  {
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'beginner'
    }
  }
],

contributions: {
  type: Number,
  default: 0,
},

badges: [
  {
    type: String,
  }
],

interests: [String],

location: {
  city: String,
  country: String,
},

isOnboarded: {
  type: Boolean,
  default: false,
},

  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },


  passwordChangedAt: Date,

  // 🔐 OTP SYSTEM
  otp: {
    code: { type: String, select: false },       // hashed OTP
    purpose: String,    // 'verify' | 'reset'
    expire: Date,
  },

  otpAttempts: {
    type: Number,
    default: 0,
  },

  otpLastSentAt: Date,

  otpRequestCount: {
    type: Number,
    default: 0,
  },

  otpRequestResetTime: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // invalidate old tokens
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
});

UserSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTime = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimeStamp < changedTime;
  }
  return false;
};

UserSchema.methods.generateOTP = function (purpose) {
  const now = Date.now();

  // reset daily counter
  if (!this.otpRequestResetTime || this.otpRequestResetTime < now) {
    this.otpRequestCount = 0;
    this.otpRequestResetTime = now + 24 * 60 * 60 * 1000;
  }

  // daily limit
  if (this.otpRequestCount >= 3) {
    throw new Error('Daily OTP limit reached');
  }

  // cooldown (1 min)
  if (this.otpLastSentAt && this.otpLastSentAt > now - 60 * 1000) {
    throw new Error('Please wait before requesting again');
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  this.otp = {
    code: crypto.createHash('sha256').update(otp).digest('hex'),
    purpose,
    expire: now + 10 * 60 * 1000,
  };

  this.otpAttempts = 0;
  this.otpLastSentAt = now;
  this.otpRequestCount += 1;

  return otp;
};

UserSchema.methods.verifyOTP = function (enteredOTP, purpose) {
  if (!this.otp || this.otp.purpose !== purpose) {
    return { success: false, message: 'Invalid OTP' };
  }

  // expired
  if (this.otp.expire < Date.now()) {
  this.otp = undefined; // auto cleanup
  return { success: false, message: 'OTP expired' };
}

  // attempt limit
  if (this.otpAttempts >= 5) {
  this.otp = undefined; // invalidate OTP
  return { success: false, message: 'Too many attempts. Request new OTP' };
}

  const hashed = crypto
    .createHash('sha256')
    .update(enteredOTP)
    .digest('hex');

  const isMatch = hashed === this.otp.code;

  if (!isMatch) {
    this.otpAttempts += 1;
    return { success: false, message: 'Incorrect OTP' };
  }

  return { success: true };
};

UserSchema.methods.clearOTP = function () {
  this.otp = undefined;
  this.otpAttempts = 0;
};

module.exports = mongoose.model('User', UserSchema);