const User = require('../models/User');
const Order = require('../models/Order');
const Position = require('../models/Position');
const DummyLeaderboard = require('../models/DummyLeaderboard');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @route   GET /api/leaderboard
 * @desc    Get leaderboard (real users + dummy entries merged)
 * @access  Public/Private
 */
const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Fetch real premium users with P&L
    const realUsers = await User.find({
      role: 'user',
      isActive: true,
      $or: [{ totalPnl: { $gt: 0 } }, { isPremium: true }],
    })
      .select('name email profilePic totalPnl totalTrades isPremium createdAt')
      .lean();

    // Fetch visible dummy entries
    const dummyEntries = await DummyLeaderboard.find({ isVisible: true }).lean();

    // Calculate win rate for real users
    const userIds = realUsers.map((u) => u._id);
    const winRateData = await Order.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          orderType: 'SELL',
          status: 'EXECUTED',
        },
      },
      {
        $group: {
          _id: '$userId',
          totalSells: { $sum: 1 },
          profitableSells: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          totalWinAmount: {
            $sum: { $cond: [{ $gt: ['$pnl', 0] }, '$pnl', 0] },
          },
          totalLossAmount: {
            $sum: { $cond: [{ $lt: ['$pnl', 0] }, '$pnl', 0] },
          },
        },
      },
    ]);

    const winRateMap = new Map(
      winRateData.map((w) => [
        w._id.toString(),
        {
          winRate: w.totalSells > 0 ? (w.profitableSells / w.totalSells) * 100 : 0,
          winAmount: w.totalWinAmount,
          lossAmount: Math.abs(w.totalLossAmount),
        },
      ])
    );

    // Format real users for leaderboard
    const formattedRealUsers = realUsers.map((user) => {
      const winData = winRateMap.get(user._id.toString()) || {
        winRate: 0,
        winAmount: 0,
        lossAmount: 0,
      };

      return {
        type: 'real',
        userId: user._id,
        name: user.name,
        profilePic: user.profilePic || null,
        totalPnl: user.totalPnl || 0,
        totalTrades: user.totalTrades || 0,
        winRate: parseFloat(winData.winRate.toFixed(2)),
        winAmount: winData.winAmount,
        lossAmount: winData.lossAmount,
        isPremium: user.isPremium,
        joinedAt: user.createdAt,
      };
    });

    // Format dummy entries
    const formattedDummyEntries = dummyEntries.map((entry) => ({
      type: 'dummy',
      dummyId: entry._id,
      name: entry.name,
      profilePic: entry.profilePic || null,
      totalPnl: entry.totalPnl,
      totalTrades: entry.totalTrades,
      winRate: entry.winRate,
      winAmount: entry.winAmount,
      lossAmount: entry.lossAmount,
      isPremium: true,
    }));

    // Merge and sort by totalPnl descending
    const combined = [...formattedRealUsers, ...formattedDummyEntries];
    combined.sort((a, b) => b.totalPnl - a.totalPnl);

    // Add rank
    const ranked = combined.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    return successResponse(res, 'Leaderboard fetched successfully', {
      leaderboard: ranked,
      total: ranked.length,
    });
  } catch (error) {
    logger.error('getLeaderboard error:', error.message);
    return errorResponse(res, 'Failed to fetch leaderboard', 500);
  }
};

/**
 * @route   GET /api/leaderboard/stats
 * @desc    Get leaderboard statistics
 * @access  Public
 */
const getLeaderboardStats = async (req, res) => {
  try {
    const [
      totalTraders,
      totalPremium,
      topGainerAgg,
      totalProfitAgg,
      recentTraders,
    ] = await Promise.all([
      User.countDocuments({ role: 'user', isActive: true }),
      User.countDocuments({ role: 'user', isPremium: true }),
      User.findOne({ role: 'user', isActive: true })
        .sort({ totalPnl: -1 })
        .select('name email totalPnl profilePic'),
      Order.aggregate([
        { $match: { orderType: 'SELL', status: 'EXECUTED', pnl: { $gt: 0 } } },
        { $group: { _id: null, totalProfit: { $sum: '$pnl' } } },
      ]),
      User.find({ role: 'user', isActive: true, isPremium: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name createdAt'),
    ]);

    const totalProfit = totalProfitAgg[0]?.totalProfit || 0;

    return successResponse(res, 'Leaderboard stats fetched', {
      totalTraders,
      totalPremiumTraders: totalPremium,
      totalProfitGenerated: totalProfit,
      topGainer: topGainerAgg
        ? {
            name: topGainerAgg.name,
            totalPnl: topGainerAgg.totalPnl,
            profilePic: topGainerAgg.profilePic,
          }
        : null,
      recentJoiners: recentTraders.map((t) => ({
        name: t.name,
        joinedAt: t.createdAt,
      })),
    });
  } catch (error) {
    logger.error('getLeaderboardStats error:', error.message);
    return errorResponse(res, 'Failed to fetch leaderboard stats', 500);
  }
};

/**
 * @route   GET /api/leaderboard/user/:userId
 * @desc    Get public profile of a user with their trade history
 * @access  Public
 */
const getUserPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      role: 'user',
      isActive: true,
    }).select('name email profilePic totalPnl totalTrades isPremium createdAt');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Get executed orders (public view - no prices, just trades)
    const orders = await Order.find({
      userId: user._id,
      status: 'EXECUTED',
    })
      .select('symbol exchange orderType quantity price pnl totalValue executedAt createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // P&L stats
    const pnlAgg = await Order.aggregate([
      { $match: { userId: user._id, orderType: 'SELL', status: 'EXECUTED' } },
      {
        $group: {
          _id: null,
          realizedPnl: { $sum: '$pnl' },
          totalSells: { $sum: 1 },
          profitableTrades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
        },
      },
    ]);

    const stats = pnlAgg[0] || { realizedPnl: 0, totalSells: 0, profitableTrades: 0 };
    const winRate =
      stats.totalSells > 0
        ? ((stats.profitableTrades / stats.totalSells) * 100).toFixed(2)
        : 0;

    return successResponse(res, 'User public profile fetched', {
      profile: {
        id: user._id,
        name: user.name,
        profilePic: user.profilePic,
        isPremium: user.isPremium,
        joinedAt: user.createdAt,
        totalTrades: user.totalTrades,
        totalPnl: user.totalPnl,
        winRate,
      },
      recentTrades: orders,
    });
  } catch (error) {
    logger.error('getUserPublicProfile error:', error.message);
    return errorResponse(res, 'Failed to fetch user profile', 500);
  }
};

module.exports = {
  getLeaderboard,
  getLeaderboardStats,
  getUserPublicProfile,
};
