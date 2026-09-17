const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Authenticate middleware - validates JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token is required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'Authentication token is required', 401);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired. Please login again.', 401);
      }
      return errorResponse(res, 'Invalid authentication token', 401);
    }

    // Fetch user from DB
    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(res, 'User not found', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    return errorResponse(res, 'Authentication failed', 500);
  }
};

/**
 * isAdmin middleware - checks admin role
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied. Admin privileges required.', 403);
  }
  next();
};

/**
 * canTrade middleware - checks if user is allowed to trade
 */
const canTrade = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  // Admin can always trade
  if (user.role === 'admin') {
    return next();
  }

  // Trial period active
  if (user.isTrialActive()) {
    return next();
  }

  // Premium with fee balance
  if (user.isPremium && user.feeBalance > 0) {
    return next();
  }

  // Premium but fee balance exhausted
  if (user.isPremium && user.feeBalance <= 0) {
    return errorResponse(
      res,
      'Your fee balance is exhausted. Please recharge by paying ₹500 to continue trading.',
      403,
      { code: 'FEE_BALANCE_EXHAUSTED' }
    );
  }

  // Not premium and trial expired
  if (!user.isPremium) {
    return errorResponse(
      res,
      'Your free trial has expired. Please pay ₹500 to activate premium and continue trading.',
      403,
      { code: 'TRIAL_EXPIRED' }
    );
  }

  return errorResponse(res, 'You are not authorized to trade at this time.', 403);
};

/**
 * Optional authentication - attaches user if token present but doesn't fail
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch {
    // Silently ignore auth errors for optional auth
    next();
  }
};

module.exports = { authenticate, isAdmin, canTrade, optionalAuth };
