const mongoose = require('mongoose');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const Position = require('../models/Position');
const { TRADE_FEE, ORDER_STATUS, POSITION_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Place a BUY order for a user
 * @param {string} userId
 * @param {string} stockId
 * @param {number} quantity
 * @param {string} priceType - 'MARKET' or 'LIMIT'
 * @param {number|null} limitPrice - required if priceType is 'LIMIT'
 */
const placeBuyOrder = async (userId, stockId, quantity, priceType = 'MARKET', limitPrice = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch user with session
    const user = await User.findById(userId).session(session).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Check trading eligibility
    if (!user.canTrade()) {
      if (user.isTrialActive()) {
        throw new Error('Trial period expired and no premium subscription found');
      }
      if (!user.isPremium) {
        throw new Error('Please subscribe to premium to continue trading');
      }
      if (user.feeBalance <= 0) {
        throw new Error(
          'Insufficient fee balance. Please recharge your account to continue trading'
        );
      }
    }

    // Fetch stock
    const stock = await Stock.findById(stockId).session(session);

    if (!stock) {
      throw new Error('Stock not found');
    }

    if (!stock.isActive) {
      throw new Error('This stock is not available for trading');
    }

    // Determine execution price
    let executionPrice;
    if (priceType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) {
        throw new Error('Limit price is required and must be positive for LIMIT orders');
      }
      executionPrice = limitPrice;
    } else {
      // MARKET order uses current LTP
      if (!stock.ltp || stock.ltp <= 0) {
        throw new Error('Stock price not available. Please try again.');
      }
      executionPrice = stock.ltp;
    }

    const totalValue = quantity * executionPrice;

    // Check sufficient dummy balance
    if (user.dummyBalance < totalValue) {
      throw new Error(
        `Insufficient balance. Required: ₹${totalValue.toFixed(2)}, Available: ₹${user.dummyBalance.toFixed(2)}`
      );
    }

    // Create order
    const order = new Order({
      userId,
      stockId,
      symbol: stock.symbol,
      token: stock.token,
      exchange: stock.exchange,
      orderType: 'BUY',
      quantity,
      price: executionPrice,
      limitPrice: priceType === 'LIMIT' ? limitPrice : null,
      priceType,
      status: ORDER_STATUS.EXECUTED,
      totalValue,
      feesDeducted: user.isPremium ? TRADE_FEE : 0,
      executedAt: new Date(),
    });

    await order.save({ session });

    // Find existing OPEN position for this user + stock
    let position = await Position.findOne({
      userId,
      stockId,
      status: POSITION_STATUS.OPEN,
    }).session(session);

    if (position) {
      // Update existing position with weighted average buy price
      const totalQty = position.quantity + quantity;
      const newAvgBuyPrice =
        (position.quantity * position.avgBuyPrice + quantity * executionPrice) / totalQty;

      position.quantity = totalQty;
      position.avgBuyPrice = newAvgBuyPrice;
      position.investedAmount = totalQty * newAvgBuyPrice;
      position.currentPrice = stock.ltp;
      position.currentValue = totalQty * stock.ltp;
      position.unrealizedPnl = (stock.ltp - newAvgBuyPrice) * totalQty;

      await position.save({ session });
    } else {
      // Create new position
      position = new Position({
        userId,
        stockId,
        symbol: stock.symbol,
        token: stock.token,
        exchange: stock.exchange,
        quantity,
        avgBuyPrice: executionPrice,
        currentPrice: stock.ltp,
        investedAmount: quantity * executionPrice,
        currentValue: quantity * stock.ltp,
        unrealizedPnl: (stock.ltp - executionPrice) * quantity,
        realizedPnl: 0,
        status: POSITION_STATUS.OPEN,
      });

      await position.save({ session });
    }

    // Deduct dummyBalance
    user.dummyBalance -= totalValue;

    // Deduct fee balance if premium
    if (user.isPremium && user.feeBalance > 0) {
      user.feeBalance = Math.max(0, user.feeBalance - TRADE_FEE);
    }

    // Increment trade count
    user.totalTrades += 1;

    await user.save({ session });

    await session.commitTransaction();

    logger.info(
      `BUY order executed: User ${userId}, Stock ${stock.symbol}, Qty ${quantity}, Price ${executionPrice}`
    );

    return {
      order,
      position,
      newBalance: user.dummyBalance,
      feeBalance: user.feeBalance,
      totalValue,
      executionPrice,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error('placeBuyOrder error:', error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Place a SELL order for a user
 * @param {string} userId
 * @param {string} stockId
 * @param {number} quantity
 * @param {string} priceType - 'MARKET' or 'LIMIT'
 * @param {number|null} limitPrice
 */
const placeSellOrder = async (userId, stockId, quantity, priceType = 'MARKET', limitPrice = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch user
    const user = await User.findById(userId).session(session).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Check trading eligibility
    if (!user.canTrade()) {
      if (!user.isPremium) {
        throw new Error('Please subscribe to premium to continue trading');
      }
      if (user.feeBalance <= 0) {
        throw new Error(
          'Insufficient fee balance. Please recharge your account to continue trading'
        );
      }
    }

    // Fetch stock
    const stock = await Stock.findById(stockId).session(session);

    if (!stock) {
      throw new Error('Stock not found');
    }

    if (!stock.isActive) {
      throw new Error('This stock is not available for trading');
    }

    // Fetch OPEN position for this user + stock
    const position = await Position.findOne({
      userId,
      stockId,
      status: POSITION_STATUS.OPEN,
    }).session(session);

    if (!position) {
      throw new Error('No open position found for this stock');
    }

    if (position.quantity < quantity) {
      throw new Error(
        `Insufficient quantity. Available: ${position.quantity}, Requested: ${quantity}`
      );
    }

    // Determine execution price
    let executionPrice;
    if (priceType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) {
        throw new Error('Limit price is required for LIMIT orders');
      }
      executionPrice = limitPrice;
    } else {
      if (!stock.ltp || stock.ltp <= 0) {
        throw new Error('Stock price not available. Please try again.');
      }
      executionPrice = stock.ltp;
    }

    // Calculate realized P&L for this sell
    const realizedPnl = (executionPrice - position.avgBuyPrice) * quantity;
    const proceeds = quantity * executionPrice;

    // Create order
    const order = new Order({
      userId,
      stockId,
      symbol: stock.symbol,
      token: stock.token,
      exchange: stock.exchange,
      orderType: 'SELL',
      quantity,
      price: executionPrice,
      limitPrice: priceType === 'LIMIT' ? limitPrice : null,
      priceType,
      status: ORDER_STATUS.EXECUTED,
      totalValue: proceeds,
      pnl: realizedPnl,
      feesDeducted: user.isPremium ? TRADE_FEE : 0,
      executedAt: new Date(),
    });

    await order.save({ session });

    // Update position
    position.quantity -= quantity;
    position.realizedPnl += realizedPnl;

    if (position.quantity === 0) {
      // Position fully closed
      position.status = POSITION_STATUS.CLOSED;
      position.closedAt = new Date();
      position.investedAmount = 0;
      position.currentValue = 0;
      position.unrealizedPnl = 0;
    } else {
      // Partial sell - update values
      position.investedAmount = position.quantity * position.avgBuyPrice;
      position.currentPrice = stock.ltp;
      position.currentValue = position.quantity * stock.ltp;
      position.unrealizedPnl = (stock.ltp - position.avgBuyPrice) * position.quantity;
    }

    await position.save({ session });

    // Add sale proceeds to user's dummy balance
    user.dummyBalance += proceeds;

    // Deduct fee balance if premium
    if (user.isPremium && user.feeBalance > 0) {
      user.feeBalance = Math.max(0, user.feeBalance - TRADE_FEE);
    }

    // Update trade stats
    user.totalTrades += 1;
    user.totalPnl += realizedPnl;

    await user.save({ session });

    await session.commitTransaction();

    logger.info(
      `SELL order executed: User ${userId}, Stock ${stock.symbol}, Qty ${quantity}, Price ${executionPrice}, PnL: ${realizedPnl}`
    );

    return {
      order,
      position,
      newBalance: user.dummyBalance,
      feeBalance: user.feeBalance,
      pnl: realizedPnl,
      proceeds,
      executionPrice,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error('placeSellOrder error:', error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get all open positions for a user with live unrealized P&L
 * @param {string} userId
 */
const getPositionsWithLivePnl = async (userId) => {
  try {
    const positions = await Position.find({
      userId,
      status: POSITION_STATUS.OPEN,
    }).populate('stockId', 'symbol name ltp change changePercent exchange token');

    const enriched = positions.map((pos) => {
      const posObj = pos.toObject();
      const currentLtp = pos.stockId ? pos.stockId.ltp : pos.currentPrice;

      posObj.currentPrice = currentLtp;
      posObj.currentValue = pos.quantity * currentLtp;
      posObj.unrealizedPnl = (currentLtp - pos.avgBuyPrice) * pos.quantity;
      posObj.unrealizedPnlPercent =
        pos.avgBuyPrice > 0
          ? ((currentLtp - pos.avgBuyPrice) / pos.avgBuyPrice) * 100
          : 0;
      posObj.investedAmount = pos.quantity * pos.avgBuyPrice;

      return posObj;
    });

    return enriched;
  } catch (error) {
    logger.error('getPositionsWithLivePnl error:', error.message);
    throw error;
  }
};

/**
 * Get closed positions for a user
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 */
const getClosedPositions = async (userId, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    const total = await Position.countDocuments({ userId, status: POSITION_STATUS.CLOSED });

    const positions = await Position.find({ userId, status: POSITION_STATUS.CLOSED })
      .populate('stockId', 'symbol name exchange')
      .sort({ closedAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      positions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('getClosedPositions error:', error.message);
    throw error;
  }
};

/**
 * Get user's portfolio summary
 * @param {string} userId
 */
const getPortfolioSummary = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const openPositions = await getPositionsWithLivePnl(userId);

    const totalInvested = openPositions.reduce((sum, pos) => sum + pos.investedAmount, 0);
    const totalCurrentValue = openPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalUnrealizedPnl = openPositions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);

    return {
      dummyBalance: user.dummyBalance,
      feeBalance: user.feeBalance,
      totalTrades: user.totalTrades,
      totalRealizedPnl: user.totalPnl,
      totalUnrealizedPnl,
      totalInvested,
      totalCurrentValue,
      totalPortfolioValue: user.dummyBalance + totalCurrentValue,
      openPositionsCount: openPositions.length,
    };
  } catch (error) {
    logger.error('getPortfolioSummary error:', error.message);
    throw error;
  }
};

module.exports = {
  placeBuyOrder,
  placeSellOrder,
  getPositionsWithLivePnl,
  getClosedPositions,
  getPortfolioSummary,
};
