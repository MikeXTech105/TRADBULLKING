const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 422, errors.array());
  }
  next();
};

/**
 * Register validation rules
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),

  validate,
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),

  validate,
];

/**
 * Place order validation rules
 */
const placeOrderValidation = [
  body('stockId')
    .notEmpty()
    .withMessage('Stock ID is required')
    .isMongoId()
    .withMessage('Invalid stock ID format'),

  body('orderType')
    .notEmpty()
    .withMessage('Order type is required')
    .isIn(['BUY', 'SELL'])
    .withMessage('Order type must be BUY or SELL'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  body('priceType')
    .optional()
    .isIn(['MARKET', 'LIMIT'])
    .withMessage('Price type must be MARKET or LIMIT'),

  body('limitPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Limit price must be a positive number'),

  validate,
];

/**
 * Add stock validation rules
 */
const addStockValidation = [
  body('symbol')
    .trim()
    .notEmpty()
    .withMessage('Symbol is required')
    .isLength({ min: 1, max: 30 })
    .withMessage('Symbol must be between 1 and 30 characters'),

  body('token')
    .trim()
    .notEmpty()
    .withMessage('Token (instrument token) is required'),

  body('exchange')
    .notEmpty()
    .withMessage('Exchange is required')
    .isIn(['NSE', 'BSE', 'NFO', 'MCX'])
    .withMessage('Exchange must be NSE, BSE, NFO, or MCX'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Stock name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Stock name must be between 1 and 200 characters'),

  body('exchangeType')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Exchange type must be 1-5'),

  validate,
];

/**
 * Change password validation
 */
const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Old password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),

  validate,
];

/**
 * Update profile validation
 */
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),

  validate,
];

/**
 * Add dummy leaderboard entry validation
 */
const addDummyLeaderboardValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('totalPnl')
    .notEmpty()
    .withMessage('Total P&L is required')
    .isNumeric()
    .withMessage('Total P&L must be a number'),

  body('totalTrades')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total trades must be a non-negative integer'),

  body('winRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Win rate must be between 0 and 100'),

  validate,
];

/**
 * Pagination query validation
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  validate,
];

/**
 * MongoDB ID param validation
 */
const mongoIdParamValidation = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  placeOrderValidation,
  addStockValidation,
  changePasswordValidation,
  updateProfileValidation,
  addDummyLeaderboardValidation,
  paginationValidation,
  mongoIdParamValidation,
};
