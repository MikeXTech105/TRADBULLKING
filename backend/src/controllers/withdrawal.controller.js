const User = require('../models/User');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { MIN_WITHDRAWAL } = require('../utils/constants');

// POST /api/withdrawals/request
// Auto-approved if user has sufficient withdrawableBalance (>= MIN_WITHDRAWAL)
const requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 'User not found', 404);

    if (amount < MIN_WITHDRAWAL)
      return errorResponse(res, `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`, 400);

    if (user.withdrawableBalance < amount)
      return errorResponse(res, `Insufficient withdrawable balance. Available: ₹${user.withdrawableBalance}`, 400);

    // Deduct from withdrawableBalance and auto-approve
    user.withdrawableBalance -= amount;
    await user.save();

    const withdrawal = await WithdrawalRequest.create({
      userId: user._id,
      amount,
      bankDetails,
      status: 'APPROVED',
      processedAt: new Date(),
    });

    logger.info(`Withdrawal auto-approved for user ${user.email}: ₹${amount}`);

    return successResponse(res, 'Withdrawal approved successfully', {
      withdrawal,
      withdrawableBalance: user.withdrawableBalance,
    }, 201);
  } catch (error) {
    logger.error('requestWithdrawal error:', error.message);
    return errorResponse(res, 'Failed to process withdrawal', 500);
  }
};

// GET /api/withdrawals/history
const getWithdrawalHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const total = await WithdrawalRequest.countDocuments({ userId: req.user._id });
    const withdrawals = await WithdrawalRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return paginatedResponse(res, 'Withdrawal history fetched', withdrawals, {
      total, page, limit, pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('getWithdrawalHistory error:', error.message);
    return errorResponse(res, 'Failed to fetch withdrawal history', 500);
  }
};

// GET /api/withdrawals/balance
const getWithdrawableBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('withdrawableBalance');
    return successResponse(res, 'Withdrawable balance fetched', {
      withdrawableBalance: user.withdrawableBalance,
    });
  } catch (error) {
    logger.error('getWithdrawableBalance error:', error.message);
    return errorResponse(res, 'Failed to fetch balance', 500);
  }
};

// Admin: GET /api/admin/withdrawals — view all for record-keeping
const adminListWithdrawals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const query = status ? { status: status.toUpperCase() } : {};
    const total = await WithdrawalRequest.countDocuments(query);
    const withdrawals = await WithdrawalRequest.find(query)
      .populate('userId', 'name email userName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return paginatedResponse(res, 'Withdrawals fetched', withdrawals, {
      total, page, limit, pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('adminListWithdrawals error:', error.message);
    return errorResponse(res, 'Failed to fetch withdrawals', 500);
  }
};

module.exports = { requestWithdrawal, getWithdrawalHistory, getWithdrawableBalance, adminListWithdrawals };
