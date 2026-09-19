const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { TRIAL_HOURS, INITIAL_BALANCE } = require('../utils/constants');

const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TBK';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    trialEndDate: {
      type: Date,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isDummy: {
      type: Boolean,
      default: false,
    },
    dummyBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    feeBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPnl: {
      type: Number,
      default: 0,
    },
    totalTrades: {
      type: Number,
      default: 0,
      min: 0,
    },
    profilePic: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    userName: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    withdrawableBalance: {
      type: Number,
      default: 0,
    },
    dailyPnl: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance (email index is auto-created by unique:true on the field)
userSchema.index({ role: 1 });
userSchema.index({ isPremium: 1 });
userSchema.index({ totalPnl: -1 });
userSchema.index({ isDummy: 1 });

// Pre-save hook to auto-generate referralCode for new users
userSchema.pre('save', function (next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = generateReferralCode();
  }
  next();
});

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook to set trialEndDate and initial balance on new user
userSchema.pre('save', function (next) {
  if (this.isNew && this.role === 'user' && !this.isDummy) {
    if (!this.trialEndDate) {
      this.trialEndDate = new Date(Date.now() + TRIAL_HOURS * 60 * 60 * 1000);
    }
    // Ensure new real users always get 1 crore starting balance
    if (!this.dummyBalance) {
      this.dummyBalance = INITIAL_BALANCE;
    }
  }
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: check if trial is active
userSchema.methods.isTrialActive = function () {
  if (!this.trialEndDate) return false;
  return new Date() < this.trialEndDate;
};

// Instance method: check if user can trade
userSchema.methods.canTrade = function () {
  if (this.role === 'admin') return true;
  // During trial period
  if (this.isTrialActive()) return true;
  // Premium with fee balance
  if (this.isPremium && this.feeBalance > 0) return true;
  return false;
};

// Virtual: trial remaining time in hours
userSchema.virtual('trialRemainingHours').get(function () {
  if (!this.trialEndDate) return 0;
  const remaining = this.trialEndDate - new Date();
  return Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
module.exports = User;
