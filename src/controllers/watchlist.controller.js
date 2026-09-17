const Watchlist = require('../models/Watchlist');
const Stock = require('../models/Stock');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * @route   GET /api/watchlist
 * @desc    Get user's watchlist with live prices
 * @access  Private
 */
const getWatchlist = async (req, res) => {
  try {
    let watchlist = await Watchlist.findOne({ userId: req.user._id });

    if (!watchlist) {
      // Create empty watchlist
      watchlist = new Watchlist({ userId: req.user._id, stocks: [] });
      await watchlist.save();
    }

    // Populate live prices for each stock
    const stockIds = watchlist.stocks.map((item) => item.stockId);
    const stocks = await Stock.find({ _id: { $in: stockIds }, isActive: true }).select(
      'symbol name token exchange ltp change changePercent high low open close volume lastUpdated'
    );

    // Build enriched watchlist
    const stockMap = new Map(stocks.map((s) => [s._id.toString(), s]));

    const enrichedStocks = watchlist.stocks
      .map((item) => {
        const stockData = stockMap.get(item.stockId.toString());
        if (!stockData) return null; // Stock might have been removed

        return {
          watchlistItemId: item._id,
          stockId: item.stockId,
          symbol: item.symbol,
          token: item.token,
          addedAt: item.addedAt,
          name: stockData.name,
          exchange: stockData.exchange,
          ltp: stockData.ltp,
          change: stockData.change,
          changePercent: stockData.changePercent,
          high: stockData.high,
          low: stockData.low,
          open: stockData.open,
          close: stockData.close,
          volume: stockData.volume,
          lastUpdated: stockData.lastUpdated,
        };
      })
      .filter(Boolean); // Remove null entries (stocks that no longer exist)

    return successResponse(res, 'Watchlist fetched successfully', {
      watchlistId: watchlist._id,
      stocks: enrichedStocks,
      count: enrichedStocks.length,
    });
  } catch (error) {
    logger.error('getWatchlist error:', error.message);
    return errorResponse(res, 'Failed to fetch watchlist', 500);
  }
};

/**
 * @route   POST /api/watchlist/add
 * @desc    Add a stock to watchlist
 * @access  Private
 */
const addToWatchlist = async (req, res) => {
  try {
    const { stockId } = req.body;

    if (!stockId) {
      return errorResponse(res, 'stockId is required', 400);
    }

    // Verify stock exists and is active
    const stock = await Stock.findOne({ _id: stockId, isActive: true });
    if (!stock) {
      return errorResponse(res, 'Stock not found or not available', 404);
    }

    // Find or create watchlist
    let watchlist = await Watchlist.findOne({ userId: req.user._id });
    if (!watchlist) {
      watchlist = new Watchlist({ userId: req.user._id, stocks: [] });
    }

    // Check if stock already in watchlist
    const alreadyExists = watchlist.stocks.some(
      (item) => item.stockId.toString() === stockId.toString()
    );

    if (alreadyExists) {
      return errorResponse(res, 'Stock is already in your watchlist', 409);
    }

    // Add stock to watchlist
    watchlist.stocks.push({
      stockId: stock._id,
      symbol: stock.symbol,
      token: stock.token,
      addedAt: new Date(),
    });

    await watchlist.save();

    logger.info(`Stock ${stock.symbol} added to watchlist for user ${req.user._id}`);

    return successResponse(res, `${stock.symbol} added to watchlist`, {
      stockId: stock._id,
      symbol: stock.symbol,
      token: stock.token,
      name: stock.name,
    }, 201);
  } catch (error) {
    logger.error('addToWatchlist error:', error.message);
    return errorResponse(res, 'Failed to add to watchlist', 500);
  }
};

/**
 * @route   DELETE /api/watchlist/:stockId
 * @desc    Remove a stock from watchlist
 * @access  Private
 */
const removeFromWatchlist = async (req, res) => {
  try {
    const { stockId } = req.params;

    const watchlist = await Watchlist.findOne({ userId: req.user._id });

    if (!watchlist) {
      return errorResponse(res, 'Watchlist not found', 404);
    }

    const originalLength = watchlist.stocks.length;
    watchlist.stocks = watchlist.stocks.filter(
      (item) => item.stockId.toString() !== stockId.toString()
    );

    if (watchlist.stocks.length === originalLength) {
      return errorResponse(res, 'Stock not found in watchlist', 404);
    }

    await watchlist.save();

    logger.info(`Stock ${stockId} removed from watchlist for user ${req.user._id}`);

    return successResponse(res, 'Stock removed from watchlist');
  } catch (error) {
    logger.error('removeFromWatchlist error:', error.message);
    return errorResponse(res, 'Failed to remove from watchlist', 500);
  }
};

/**
 * @route   DELETE /api/watchlist
 * @desc    Clear entire watchlist
 * @access  Private
 */
const clearWatchlist = async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({ userId: req.user._id });

    if (!watchlist) {
      return successResponse(res, 'Watchlist is already empty');
    }

    watchlist.stocks = [];
    await watchlist.save();

    return successResponse(res, 'Watchlist cleared successfully');
  } catch (error) {
    logger.error('clearWatchlist error:', error.message);
    return errorResponse(res, 'Failed to clear watchlist', 500);
  }
};

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  clearWatchlist,
};
