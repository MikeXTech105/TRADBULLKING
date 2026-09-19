const Order = require('../models/Order');
const Position = require('../models/Position');
const tradeService = require('../services/trade.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @route   POST /api/orders/buy
 * @desc    Place a BUY order
 * @access  Private
 */
const placeBuyOrder = async (req, res) => {
  try {
    const { stockId, quantity, priceType = 'MARKET', limitPrice } = req.body;

    const result = await tradeService.placeBuyOrder(
      req.user._id,
      stockId,
      parseInt(quantity),
      priceType,
      limitPrice ? parseFloat(limitPrice) : null
    );

    return successResponse(res, 'Buy order placed successfully', {
      order: result.order,
      position: result.position,
      newBalance: result.newBalance,
      feeBalance: result.feeBalance,
      feesDeducted: result.feesDeducted,
      executionPrice: result.executionPrice,
      totalValue: result.totalValue,
    }, 201);
  } catch (error) {
    logger.error('placeBuyOrder controller error:', error.message);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('Insufficient') ? 400 :
      error.message.includes('not available') ? 400 : 500;
    return errorResponse(res, error.message, statusCode);
  }
};

/**
 * @route   POST /api/orders/sell
 * @desc    Place a SELL order
 * @access  Private
 */
const placeSellOrder = async (req, res) => {
  try {
    const { stockId, quantity, priceType = 'MARKET', limitPrice } = req.body;

    const result = await tradeService.placeSellOrder(
      req.user._id,
      stockId,
      parseInt(quantity),
      priceType,
      limitPrice ? parseFloat(limitPrice) : null
    );

    return successResponse(res, 'Sell order placed successfully', {
      order: result.order,
      position: result.position,
      newBalance: result.newBalance,
      feeBalance: result.feeBalance,
      feesDeducted: result.feesDeducted,
      pnl: result.pnl,
      proceeds: result.proceeds,
      executionPrice: result.executionPrice,
    }, 201);
  } catch (error) {
    logger.error('placeSellOrder controller error:', error.message);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('Insufficient') ? 400 :
      error.message.includes('No open position') ? 400 : 500;
    return errorResponse(res, error.message, statusCode);
  }
};

/**
 * @route   GET /api/orders
 * @desc    Get user's order history
 * @access  Private
 */
const getOrderHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const orderType = req.query.orderType; // BUY, SELL
    const status = req.query.status; // PENDING, EXECUTED, CANCELLED, FAILED
    const symbol = req.query.symbol;

    let query = { userId: req.user._id };

    if (orderType) query.orderType = orderType.toUpperCase();
    if (status) query.status = status.toUpperCase();
    if (symbol) query.symbol = symbol.toUpperCase();

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('stockId', 'symbol name exchange ltp')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginatedResponse(res, 'Order history fetched', orders, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('getOrderHistory error:', error.message);
    return errorResponse(res, 'Failed to fetch order history', 500);
  }
};

/**
 * @route   GET /api/orders/:id
 * @desc    Get order details by ID
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('stockId', 'symbol name exchange ltp');

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    return successResponse(res, 'Order details fetched', order);
  } catch (error) {
    logger.error('getOrderById error:', error.message);
    return errorResponse(res, 'Failed to fetch order', 500);
  }
};

/**
 * @route   GET /api/orders/positions/open
 * @desc    Get user's open positions with live P&L
 * @access  Private
 */
const getOpenPositions = async (req, res) => {
  try {
    const positions = await tradeService.getPositionsWithLivePnl(req.user._id);

    return successResponse(res, 'Open positions fetched', positions);
  } catch (error) {
    logger.error('getOpenPositions error:', error.message);
    return errorResponse(res, 'Failed to fetch positions', 500);
  }
};

/**
 * @route   GET /api/orders/positions/closed
 * @desc    Get user's closed positions
 * @access  Private
 */
const getClosedPositions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await tradeService.getClosedPositions(req.user._id, page, limit);

    return paginatedResponse(res, 'Closed positions fetched', result.positions, result.pagination);
  } catch (error) {
    logger.error('getClosedPositions error:', error.message);
    return errorResponse(res, 'Failed to fetch closed positions', 500);
  }
};

/**
 * @route   GET /api/orders/portfolio/summary
 * @desc    Get portfolio summary
 * @access  Private
 */
const getPortfolioSummary = async (req, res) => {
  try {
    const summary = await tradeService.getPortfolioSummary(req.user._id);

    return successResponse(res, 'Portfolio summary fetched', summary);
  } catch (error) {
    logger.error('getPortfolioSummary error:', error.message);
    return errorResponse(res, 'Failed to fetch portfolio summary', 500);
  }
};

/**
 * @route   GET /api/orders/pnl/summary
 * @desc    Get P&L summary for current user
 * @access  Private
 */
const getPnlSummary = async (req, res) => {
  try {
    const pnlAgg = await Order.aggregate([
      {
        $match: {
          userId: req.user._id,
          orderType: 'SELL',
          status: 'EXECUTED',
        },
      },
      {
        $group: {
          _id: null,
          totalRealizedPnl: { $sum: '$pnl' },
          totalSells: { $sum: 1 },
          profitableTrades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          losingTrades: { $sum: { $cond: [{ $lt: ['$pnl', 0] }, 1, 0] } },
          maxProfit: { $max: '$pnl' },
          maxLoss: { $min: '$pnl' },
        },
      },
    ]);

    const pnlData = pnlAgg[0] || {
      totalRealizedPnl: 0,
      totalSells: 0,
      profitableTrades: 0,
      losingTrades: 0,
      maxProfit: 0,
      maxLoss: 0,
    };

    const openPositions = await tradeService.getPositionsWithLivePnl(req.user._id);
    const totalUnrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

    return successResponse(res, 'P&L summary fetched', {
      realizedPnl: pnlData.totalRealizedPnl,
      unrealizedPnl: totalUnrealizedPnl,
      totalPnl: pnlData.totalRealizedPnl + totalUnrealizedPnl,
      totalTrades: req.user.totalTrades,
      sellTrades: pnlData.totalSells,
      profitableTrades: pnlData.profitableTrades,
      losingTrades: pnlData.losingTrades,
      winRate:
        pnlData.totalSells > 0
          ? ((pnlData.profitableTrades / pnlData.totalSells) * 100).toFixed(2)
          : 0,
      maxProfit: pnlData.maxProfit,
      maxLoss: pnlData.maxLoss,
      openPositionsCount: openPositions.length,
    });
  } catch (error) {
    logger.error('getPnlSummary error:', error.message);
    return errorResponse(res, 'Failed to fetch P&L summary', 500);
  }
};

module.exports = {
  placeBuyOrder,
  placeSellOrder,
  getOrderHistory,
  getOrderById,
  getOpenPositions,
  getClosedPositions,
  getPortfolioSummary,
  getPnlSummary,
};
