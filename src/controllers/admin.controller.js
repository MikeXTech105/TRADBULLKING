const User = require('../models/User');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const Position = require('../models/Position');
const Payment = require('../models/Payment');
const DummyLeaderboard = require('../models/DummyLeaderboard');
const angeloneService = require('../services/angelone.service');
const angeloneConfig = require('../config/angelone');
const wsService = require('../services/websocket.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

// =================== USER MANAGEMENT ===================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const filter = req.query.filter; // 'premium', 'trial', 'expired'

    let query = { role: 'user' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (filter === 'premium') {
      query.isPremium = true;
    } else if (filter === 'trial') {
      query.trialEndDate = { $gt: new Date() };
      query.isPremium = false;
    } else if (filter === 'expired') {
      query.trialEndDate = { $lt: new Date() };
      query.isPremium = false;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginatedResponse(res, 'Users fetched successfully', users, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Admin getAllUsers error:', error.message);
    return errorResponse(res, 'Failed to fetch users', 500);
  }
};

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details
 */
const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const totalOrders = await Order.countDocuments({ userId: user._id });
    const openPositions = await Position.countDocuments({ userId: user._id, status: 'OPEN' });
    const totalPayments = await Payment.countDocuments({ userId: user._id, status: 'SUCCESS' });

    return successResponse(res, 'User details fetched', {
      user,
      stats: { totalOrders, openPositions, totalPayments },
    });
  } catch (error) {
    logger.error('Admin getUserDetail error:', error.message);
    return errorResponse(res, 'Failed to fetch user details', 500);
  }
};

/**
 * @route   GET /api/admin/users/:id/trades
 * @desc    Get user's trade history
 */
const getUserTrades = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const total = await Order.countDocuments({ userId: user._id });
    const orders = await Order.find({ userId: user._id })
      .populate('stockId', 'symbol name exchange')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginatedResponse(res, 'User trades fetched', orders, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Admin getUserTrades error:', error.message);
    return errorResponse(res, 'Failed to fetch user trades', 500);
  }
};

/**
 * @route   GET /api/admin/users/:id/pnl
 * @desc    Get user's P&L summary
 */
const getUserPnl = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Aggregate realized P&L from sell orders
    const pnlAgg = await Order.aggregate([
      { $match: { userId: user._id, orderType: 'SELL', status: 'EXECUTED' } },
      {
        $group: {
          _id: null,
          totalPnl: { $sum: '$pnl' },
          totalSells: { $sum: 1 },
          profitableTrades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          losingTrades: { $sum: { $cond: [{ $lt: ['$pnl', 0] }, 1, 0] } },
        },
      },
    ]);

    const pnlData = pnlAgg[0] || {
      totalPnl: 0,
      totalSells: 0,
      profitableTrades: 0,
      losingTrades: 0,
    };

    // Open positions with unrealized P&L
    const openPositions = await Position.find({ userId: user._id, status: 'OPEN' }).populate(
      'stockId',
      'ltp symbol'
    );

    const unrealizedPnl = openPositions.reduce((sum, pos) => {
      const ltp = pos.stockId ? pos.stockId.ltp : pos.currentPrice;
      return sum + (ltp - pos.avgBuyPrice) * pos.quantity;
    }, 0);

    return successResponse(res, 'User P&L fetched', {
      userId: user._id,
      name: user.name,
      email: user.email,
      dummyBalance: user.dummyBalance,
      feeBalance: user.feeBalance,
      totalRealizedPnl: pnlData.totalPnl,
      unrealizedPnl,
      totalPnl: pnlData.totalPnl + unrealizedPnl,
      totalTrades: user.totalTrades,
      profitableTrades: pnlData.profitableTrades,
      losingTrades: pnlData.losingTrades,
      winRate:
        pnlData.totalSells > 0
          ? ((pnlData.profitableTrades / pnlData.totalSells) * 100).toFixed(2)
          : 0,
    });
  } catch (error) {
    logger.error('Admin getUserPnl error:', error.message);
    return errorResponse(res, 'Failed to fetch user P&L', 500);
  }
};

/**
 * @route   PUT /api/admin/users/:id/toggle-active
 * @desc    Activate/deactivate user
 */
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (user.role === 'admin') {
      return errorResponse(res, 'Cannot deactivate admin user', 400);
    }

    user.isActive = !user.isActive;
    await user.save();

    return successResponse(
      res,
      `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      { isActive: user.isActive }
    );
  } catch (error) {
    logger.error('Admin toggleUserActive error:', error.message);
    return errorResponse(res, 'Failed to toggle user status', 500);
  }
};

// =================== STOCK MANAGEMENT ===================

/**
 * @route   POST /api/admin/stocks
 * @desc    Add a new stock
 */
const addStock = async (req, res) => {
  try {
    const { symbol, token, exchange, name, exchangeType, high52, low52 } = req.body;

    // Check if stock with token already exists
    const existingStock = await Stock.findOne({ token });
    if (existingStock) {
      return errorResponse(res, 'Stock with this token already exists', 409);
    }

    const stock = new Stock({
      symbol: symbol.toUpperCase(),
      token,
      exchange,
      exchangeType: exchangeType || (exchange === 'NSE' ? 1 : exchange === 'BSE' ? 3 : 1),
      name,
      high52: high52 || 0,
      low52: low52 || 0,
      isActive: false,
      addedBy: req.user._id,
    });

    await stock.save();

    logger.info(`Stock added by admin: ${symbol} (${exchange})`);

    return successResponse(res, 'Stock added successfully', stock, 201);
  } catch (error) {
    logger.error('Admin addStock error:', error.message);
    if (error.code === 11000) {
      return errorResponse(res, 'Stock with this token already exists', 409);
    }
    return errorResponse(res, 'Failed to add stock', 500);
  }
};

/**
 * @route   PUT /api/admin/stocks/:id
 * @desc    Update stock details
 */
const updateStock = async (req, res) => {
  try {
    const { name, high52, low52, exchangeType } = req.body;

    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return errorResponse(res, 'Stock not found', 404);
    }

    if (name) stock.name = name;
    if (high52 !== undefined) stock.high52 = high52;
    if (low52 !== undefined) stock.low52 = low52;
    if (exchangeType !== undefined) stock.exchangeType = exchangeType;

    await stock.save();

    return successResponse(res, 'Stock updated successfully', stock);
  } catch (error) {
    logger.error('Admin updateStock error:', error.message);
    return errorResponse(res, 'Failed to update stock', 500);
  }
};

/**
 * @route   PUT /api/admin/stocks/:id/toggle
 * @desc    Enable or disable a stock
 */
const toggleStockActive = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return errorResponse(res, 'Stock not found', 404);
    }

    const wasActive = stock.isActive;
    stock.isActive = !stock.isActive;
    await stock.save();

    // Subscribe/unsubscribe from WebSocket
    if (stock.isActive && !wasActive) {
      wsService.subscribe([{ exchange: stock.exchange, token: stock.token }]);
    } else if (!stock.isActive && wasActive) {
      wsService.unsubscribe([{ exchange: stock.exchange, token: stock.token }]);
    }

    return successResponse(
      res,
      `Stock ${stock.isActive ? 'enabled' : 'disabled'} successfully`,
      { isActive: stock.isActive, symbol: stock.symbol }
    );
  } catch (error) {
    logger.error('Admin toggleStockActive error:', error.message);
    return errorResponse(res, 'Failed to toggle stock status', 500);
  }
};

/**
 * @route   DELETE /api/admin/stocks/:id
 * @desc    Delete a stock
 */
const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return errorResponse(res, 'Stock not found', 404);
    }

    // Check if stock has open positions
    const openPositions = await Position.countDocuments({ stockId: stock._id, status: 'OPEN' });
    if (openPositions > 0) {
      return errorResponse(
        res,
        `Cannot delete stock with ${openPositions} open positions`,
        400
      );
    }

    // Unsubscribe from WebSocket if active
    if (stock.isActive) {
      wsService.unsubscribe([{ exchange: stock.exchange, token: stock.token }]);
    }

    await Stock.findByIdAndDelete(req.params.id);

    return successResponse(res, 'Stock deleted successfully');
  } catch (error) {
    logger.error('Admin deleteStock error:', error.message);
    return errorResponse(res, 'Failed to delete stock', 500);
  }
};

/**
 * @route   POST /api/admin/stocks/sync-prices
 * @desc    Sync prices for all active stocks from AngelOne
 */
const syncStockPrices = async (req, res) => {
  try {
    const session = angeloneConfig.getSession();

    if (!angeloneConfig.isSessionValid()) {
      return errorResponse(
        res,
        'AngelOne session not available. Please configure AngelOne credentials.',
        503
      );
    }

    const activeStocks = await Stock.find({ isActive: true });

    if (activeStocks.length === 0) {
      return successResponse(res, 'No active stocks to sync', { updated: 0 });
    }

    // Group by exchange
    const exchangeTokens = {};
    activeStocks.forEach((stock) => {
      if (!exchangeTokens[stock.exchange]) {
        exchangeTokens[stock.exchange] = [];
      }
      exchangeTokens[stock.exchange].push(stock.token);
    });

    const marketData = await angeloneService.getMarketData(
      'FULL',
      exchangeTokens,
      session.jwtToken
    );

    let updatedCount = 0;
    const bulkOps = [];

    if (marketData && marketData.fetched) {
      for (const item of marketData.fetched) {
        bulkOps.push({
          updateOne: {
            filter: { token: item.symbolToken },
            update: {
              $set: {
                ltp: item.ltp,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                change: item.netChange,
                changePercent: item.percentChange,
                volume: item.tradeVolume,
                lastUpdated: new Date(),
              },
            },
          },
        });
        updatedCount++;
      }
    }

    if (bulkOps.length > 0) {
      await Stock.bulkWrite(bulkOps);
    }

    return successResponse(res, `Synced prices for ${updatedCount} stocks`, {
      updated: updatedCount,
    });
  } catch (error) {
    logger.error('Admin syncStockPrices error:', error.message);
    return errorResponse(res, 'Failed to sync stock prices', 500);
  }
};

/**
 * @route   POST /api/admin/angelone/session
 * @desc    Initialize AngelOne session
 */
const initAngelOneSession = async (req, res) => {
  try {
    const {
      clientId = process.env.ANGELONE_CLIENT_ID,
      password = process.env.ANGELONE_PASSWORD,
      totp,
    } = req.body;

    if (!clientId || !password || !totp) {
      return errorResponse(res, 'clientId, password, and totp are required', 400);
    }

    const sessionData = await angeloneConfig.generateSession(clientId, password, totp);

    // Connect WebSocket with new session
    wsService.connect(sessionData.jwtToken, sessionData.feedToken, sessionData.clientCode);

    // Subscribe active stocks
    const activeStocks = await Stock.find({ isActive: true }).select('token exchange');
    if (activeStocks.length > 0) {
      const tokenList = activeStocks.map((s) => ({ exchange: s.exchange, token: s.token }));
      wsService.subscribe(tokenList);
    }

    return successResponse(res, 'AngelOne session initialized successfully', {
      clientCode: sessionData.clientCode,
      hasJwtToken: !!sessionData.jwtToken,
      hasFeedToken: !!sessionData.feedToken,
    });
  } catch (error) {
    logger.error('Admin initAngelOneSession error:', error.message);
    return errorResponse(res, `Failed to initialize AngelOne session: ${error.message}`, 500);
  }
};

// =================== ANGELONE INSTRUMENTS ===================

/**
 * @route   GET /api/admin/angelone/instruments
 * @desc    Fetch all instruments from AngelOne with optional search/filter
 */
const getAngelOneInstruments = async (req, res) => {
  try {
    const { search, exchange, instrumenttype, page = 1, limit = 50 } = req.query;

    const allInstruments = await angeloneService.getAllInstruments();

    let filtered = allInstruments;

    if (exchange) {
      filtered = filtered.filter(
        (i) => i.exch_seg && i.exch_seg.toUpperCase() === exchange.toUpperCase()
      );
    }

    if (instrumenttype) {
      filtered = filtered.filter(
        (i) => i.instrumenttype && i.instrumenttype.toUpperCase() === instrumenttype.toUpperCase()
      );
    }

    if (search) {
      const keyword = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.name && i.name.toLowerCase().includes(keyword)) ||
          (i.symbol && i.symbol.toLowerCase().includes(keyword)) ||
          (i.token && i.token.toString().includes(keyword))
      );
    }

    const total = filtered.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      message: 'AngelOne instruments fetched successfully',
      data: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Admin getAngelOneInstruments error:', error.message);
    return errorResponse(res, 'Failed to fetch AngelOne instruments', 500);
  }
};

// =================== LEADERBOARD MANAGEMENT ===================

/**
 * @route   GET /api/admin/leaderboard
 * @desc    Get all dummy leaderboard entries (including hidden)
 */
const getAllDummyLeaderboard = async (req, res) => {
  try {
    const entries = await DummyLeaderboard.find()
      .populate('addedBy', 'name email')
      .sort({ totalPnl: -1 });

    return successResponse(res, 'Dummy leaderboard entries fetched', entries);
  } catch (error) {
    logger.error('Admin getAllDummyLeaderboard error:', error.message);
    return errorResponse(res, 'Failed to fetch dummy leaderboard', 500);
  }
};

/**
 * @route   POST /api/admin/leaderboard
 * @desc    Add dummy leaderboard entry
 */
const addDummyLeaderboard = async (req, res) => {
  try {
    const { name, profilePic, totalPnl, totalTrades, winRate, winAmount, lossAmount } = req.body;

    const entry = new DummyLeaderboard({
      name,
      profilePic: profilePic || null,
      totalPnl,
      totalTrades: totalTrades || 0,
      winRate: winRate || 0,
      winAmount: winAmount || 0,
      lossAmount: lossAmount || 0,
      isVisible: true,
      addedBy: req.user._id,
    });

    await entry.save();

    return successResponse(res, 'Dummy leaderboard entry added successfully', entry, 201);
  } catch (error) {
    logger.error('Admin addDummyLeaderboard error:', error.message);
    return errorResponse(res, 'Failed to add dummy leaderboard entry', 500);
  }
};

/**
 * @route   PUT /api/admin/leaderboard/:id
 * @desc    Update dummy leaderboard entry
 */
const updateDummyLeaderboard = async (req, res) => {
  try {
    const { name, profilePic, totalPnl, totalTrades, winRate, winAmount, lossAmount, isVisible } =
      req.body;

    const entry = await DummyLeaderboard.findById(req.params.id);
    if (!entry) {
      return errorResponse(res, 'Leaderboard entry not found', 404);
    }

    if (name !== undefined) entry.name = name;
    if (profilePic !== undefined) entry.profilePic = profilePic;
    if (totalPnl !== undefined) entry.totalPnl = totalPnl;
    if (totalTrades !== undefined) entry.totalTrades = totalTrades;
    if (winRate !== undefined) entry.winRate = winRate;
    if (winAmount !== undefined) entry.winAmount = winAmount;
    if (lossAmount !== undefined) entry.lossAmount = lossAmount;
    if (isVisible !== undefined) entry.isVisible = isVisible;

    await entry.save();

    return successResponse(res, 'Leaderboard entry updated successfully', entry);
  } catch (error) {
    logger.error('Admin updateDummyLeaderboard error:', error.message);
    return errorResponse(res, 'Failed to update leaderboard entry', 500);
  }
};

/**
 * @route   DELETE /api/admin/leaderboard/:id
 * @desc    Delete dummy leaderboard entry
 */
const deleteDummyLeaderboard = async (req, res) => {
  try {
    const entry = await DummyLeaderboard.findById(req.params.id);
    if (!entry) {
      return errorResponse(res, 'Leaderboard entry not found', 404);
    }

    await DummyLeaderboard.findByIdAndDelete(req.params.id);

    return successResponse(res, 'Leaderboard entry deleted successfully');
  } catch (error) {
    logger.error('Admin deleteDummyLeaderboard error:', error.message);
    return errorResponse(res, 'Failed to delete leaderboard entry', 500);
  }
};

// =================== DASHBOARD ===================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Admin dashboard overview
 */
const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      premiumUsers,
      trialUsers,
      totalOrders,
      totalActiveStocks,
      recentPayments,
      totalRevenue,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isPremium: true }),
      User.countDocuments({ role: 'user', trialEndDate: { $gt: new Date() }, isPremium: false }),
      Order.countDocuments({ status: 'EXECUTED' }),
      Stock.countDocuments({ isActive: true }),
      Payment.find({ status: 'SUCCESS' })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),
      Payment.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    // Top traders by total P&L
    const topTraders = await User.find({ role: 'user', isPremium: true })
      .select('name email totalPnl totalTrades')
      .sort({ totalPnl: -1 })
      .limit(5);

    // Recent orders
    const recentOrders = await Order.find({ status: 'EXECUTED' })
      .populate('userId', 'name email')
      .populate('stockId', 'symbol')
      .sort({ createdAt: -1 })
      .limit(10);

    return successResponse(res, 'Dashboard data fetched', {
      stats: {
        totalUsers,
        premiumUsers,
        trialUsers,
        expiredUsers: totalUsers - premiumUsers - trialUsers,
        totalOrders,
        totalActiveStocks,
        totalRevenue: revenue,
      },
      topTraders,
      recentPayments,
      recentOrders,
      wsStatus: wsService.getStatus(),
    });
  } catch (error) {
    logger.error('Admin getDashboard error:', error.message);
    return errorResponse(res, 'Failed to fetch dashboard data', 500);
  }
};

/**
 * @route   GET /api/admin/stocks
 * @desc    Get all stocks (admin view - includes disabled stocks)
 */
const getAllStocks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const exchange = req.query.exchange;

    let query = {};
    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    if (exchange) query.exchange = exchange;

    const total = await Stock.countDocuments(query);
    const stocks = await Stock.find(query)
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginatedResponse(res, 'Stocks fetched successfully', stocks, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Admin getAllStocks error:', error.message);
    return errorResponse(res, 'Failed to fetch stocks', 500);
  }
};

module.exports = {
  getAllUsers,
  getUserDetail,
  getUserTrades,
  getUserPnl,
  toggleUserActive,
  addStock,
  updateStock,
  toggleStockActive,
  deleteStock,
  syncStockPrices,
  initAngelOneSession,
  getAngelOneInstruments,
  getAllDummyLeaderboard,
  addDummyLeaderboard,
  updateDummyLeaderboard,
  deleteDummyLeaderboard,
  getDashboard,
  getAllStocks,
};
