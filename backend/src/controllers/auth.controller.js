const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { TRIAL_HOURS, INITIAL_BALANCE } = require('../utils/constants');

/**
 * Generate JWT access token
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email is already registered', 409);
    }

    // Create new user — trialEndDate and dummyBalance are also set by pre-save hook as fallback
    const user = new User({
      name,
      email,
      password,
      phone: phone || undefined,
      role: 'user',
      dummyBalance: INITIAL_BALANCE, // 1 crore on registration
      lastLogin: new Date(),
    });

    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    logger.info(`New user registered: ${email}`);

    return successResponse(
      res,
      'Registration successful! You have 48 hours of free trial.',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isPremium: user.isPremium,
          trialEndDate: user.trialEndDate,
          dummyBalance: user.dummyBalance,
          feeBalance: user.feeBalance,
          totalPnl: user.totalPnl,
          totalTrades: user.totalTrades,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        },
      },
      201
    );
  } catch (error) {
    logger.error('Register error:', error.message);
    if (error.code === 11000) {
      return errorResponse(res, 'Email is already registered', 409);
    }
    return errorResponse(res, 'Registration failed. Please try again.', 500);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        'Your account has been deactivated. Please contact support.',
        403
      );
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);

    return successResponse(res, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPremium: user.isPremium,
        trialEndDate: user.trialEndDate,
        isTrialActive: user.isTrialActive(),
        canTrade: user.canTrade(),
        dummyBalance: user.dummyBalance,
        feeBalance: user.feeBalance,
        totalPnl: user.totalPnl,
        totalTrades: user.totalTrades,
        profilePic: user.profilePic,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret'
      );
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Refresh token has expired. Please login again.', 401);
      }
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return errorResponse(res, 'User not found or account deactivated', 401);
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    return successResponse(res, 'Token refreshed successfully', {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });
  } catch (error) {
    logger.error('RefreshToken error:', error.message);
    return errorResponse(res, 'Token refresh failed', 500);
  }
};

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, 'Profile fetched successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isPremium: user.isPremium,
      isActive: user.isActive,
      trialEndDate: user.trialEndDate,
      isTrialActive: user.isTrialActive(),
      canTrade: user.canTrade(),
      dummyBalance: user.dummyBalance,
      feeBalance: user.feeBalance,
      totalPnl: user.totalPnl,
      totalTrades: user.totalTrades,
      profilePic: user.profilePic,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('GetProfile error:', error.message);
    return errorResponse(res, 'Failed to fetch profile', 500);
  }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;

    await user.save();

    logger.info(`Profile updated for user: ${user.email}`);

    return successResponse(res, 'Profile updated successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePic: user.profilePic,
    });
  } catch (error) {
    logger.error('UpdateProfile error:', error.message);
    return errorResponse(res, 'Failed to update profile', 500);
  }
};

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Check new password is different
    if (oldPassword === newPassword) {
      return errorResponse(res, 'New password must be different from current password', 400);
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    return successResponse(res, 'Password changed successfully');
  } catch (error) {
    logger.error('ChangePassword error:', error.message);
    return errorResponse(res, 'Failed to change password', 500);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
};
