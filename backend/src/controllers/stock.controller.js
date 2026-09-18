const Stock = require('../models/Stock');
const StockCandle = require('../models/StockCandle');
const angeloneService = require('../services/angelone.service');
const angeloneConfig = require('../config/angelone');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

// Helper: convert Date to IST string for AngelOne API ("YYYY-MM-DD HH:MM")
const toISTString = (date) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().replace('T', ' ').substring(0, 16);
};

// Helper: how far back to fetch based on interval
const daysBackForInterval = {
  ONE_MINUTE: 1,
  THREE_MINUTE: 3,
  FIVE_MINUTE: 5,
  TEN_MINUTE: 7,
  FIFTEEN_MINUTE: 10,
  THIRTY_MINUTE: 20,
  ONE_HOUR: 30,
  ONE_DAY: 365,
};

// Map AngelOne interval → StockCandle interval string
const angeloneToStoredInterval = {
  ONE_MINUTE: '1min', THREE_MINUTE: '3min', FIVE_MINUTE: '5min',
  TEN_MINUTE: '10min', FIFTEEN_MINUTE: '15min', THIRTY_MINUTE: '30min',
  ONE_HOUR: '1hr', ONE_DAY: '1day',
};

/**
 * @route   GET /api/stocks
 * @desc    Get all active stocks
 * @access  Private
 */
const getActiveStocks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const exchange = req.query.exchange;
    const search = req.query.search || '';

    let query = { isActive: true };

    if (exchange) {
      query.exchange = exchange.toUpperCase();
    }

    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Stock.countDocuments(query);
    const stocks = await Stock.find(query)
      .select('symbol token exchange name ltp change changePercent high low open close volume high52 low52 lastUpdated')
      .sort({ symbol: 1 })
      .skip(skip)
      .limit(limit);

    return paginatedResponse(res, 'Stocks fetched successfully', stocks, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('getActiveStocks error:', error.message);
    return errorResponse(res, 'Failed to fetch stocks', 500);
  }
};

/**
 * @route   GET /api/stocks/:id
 * @desc    Get stock details by ID
 * @access  Private
 */
const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findOne({ _id: req.params.id, isActive: true });

    if (!stock) {
      return errorResponse(res, 'Stock not found', 404);
    }

    return successResponse(res, 'Stock details fetched', stock);
  } catch (error) {
    logger.error('getStockById error:', error.message);
    return errorResponse(res, 'Failed to fetch stock details', 500);
  }
};

/**
 * @route   GET /api/stocks/symbol/:symbol
 * @desc    Get stock by symbol
 * @access  Private
 */
const getStockBySymbol = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      symbol: req.params.symbol.toUpperCase(),
      isActive: true,
    });

    if (!stock) {
      return errorResponse(res, 'Stock not found', 404);
    }

    return successResponse(res, 'Stock details fetched', stock);
  } catch (error) {
    logger.error('getStockBySymbol error:', error.message);
    return errorResponse(res, 'Failed to fetch stock', 500);
  }
};

/**
 * @route   GET /api/stocks/search
 * @desc    Search stocks by name or symbol
 * @access  Private
 */
const searchStocks = async (req, res) => {
  try {
    const { q, exchange } = req.query;

    if (!q || q.trim().length < 1) {
      return errorResponse(res, 'Search query is required', 400);
    }

    let query = { isActive: true };

    // Use text search if index exists, fallback to regex
    try {
      query.$text = { $search: q };
      const stocks = await Stock.find(query)
        .select('symbol token exchange name ltp change changePercent')
        .limit(20);

      return successResponse(res, 'Search results', stocks);
    } catch {
      // Fallback to regex search
      query = {
        isActive: true,
        $or: [
          { symbol: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
        ],
      };

      if (exchange) query.exchange = exchange.toUpperCase();

      const stocks = await Stock.find(query)
        .select('symbol token exchange name ltp change changePercent')
        .limit(20);

      return successResponse(res, 'Search results', stocks);
    }
  } catch (error) {
    logger.error('searchStocks error:', error.message);
    return errorResponse(res, 'Search failed', 500);
  }
};

/**
 * @route   POST /api/stocks/search-angelone
 * @desc    Search stocks from AngelOne API
 * @access  Private
 */
const searchAngelOne = async (req, res) => {
  try {
    const { exchange, searchscrip } = req.body;

    if (!exchange || !searchscrip) {
      return errorResponse(res, 'exchange and searchscrip are required', 400);
    }

    const session = angeloneConfig.getSession();
    if (!angeloneConfig.isSessionValid()) {
      return errorResponse(res, 'AngelOne session not available', 503);
    }

    const results = await angeloneService.searchScrip(exchange, searchscrip, session.jwtToken);

    return successResponse(res, 'AngelOne search results', results);
  } catch (error) {
    logger.error('searchAngelOne error:', error.message);
    return errorResponse(res, 'AngelOne search failed', 500);
  }
};

/**
 * @route   GET /api/stocks/:id/historical
 * @desc    Get historical OHLC data for a stock
 * @access  Private
 */
const getHistoricalData = async (req, res) => {
  try {
    const { interval, fromdate, todate } = req.query;

    if (!interval || !fromdate || !todate) {
      return errorResponse(res, 'interval, fromdate, todate are required', 400);
    }

    const stock = await Stock.findOne({ _id: req.params.id, isActive: true });
    if (!stock) {
      return errorResponse(res, 'Stock not found', 404);
    }

    const session = angeloneConfig.getSession();
    if (!angeloneConfig.isSessionValid()) {
      return errorResponse(res, 'AngelOne session not available', 503);
    }

    const data = await angeloneService.getHistoricalData(
      {
        exchange: stock.exchange,
        symboltoken: stock.token,
        interval,
        fromdate,
        todate,
      },
      session.jwtToken
    );

    return successResponse(res, 'Historical data fetched', {
      symbol: stock.symbol,
      exchange: stock.exchange,
      interval,
      candles: data,
    });
  } catch (error) {
    logger.error('getHistoricalData error:', error.message);
    return errorResponse(res, 'Failed to fetch historical data', 500);
  }
};

/**
 * @route   GET /api/stocks/:id/ltp
 * @desc    Get live LTP for a stock
 * @access  Private
 */
const getLTP = async (req, res) => {
  try {
    const stock = await Stock.findOne({ _id: req.params.id, isActive: true });
    if (!stock) {
      return errorResponse(res, 'Stock not found', 404);
    }

    // Return from DB first (updated by WebSocket)
    const liveData = {
      symbol: stock.symbol,
      token: stock.token,
      exchange: stock.exchange,
      ltp: stock.ltp,
      change: stock.change,
      changePercent: stock.changePercent,
      high: stock.high,
      low: stock.low,
      open: stock.open,
      close: stock.close,
      volume: stock.volume,
      lastUpdated: stock.lastUpdated,
    };

    // Optionally fetch fresh from AngelOne if session available
    if (angeloneConfig.isSessionValid() && req.query.fresh === 'true') {
      try {
        const session = angeloneConfig.getSession();
        const ltpData = await angeloneService.getLTP(
          stock.exchange,
          stock.symbol,
          stock.token,
          session.jwtToken
        );

        if (ltpData) {
          liveData.ltp = ltpData.ltp;
          liveData.lastUpdated = new Date();

          // Update DB
          await Stock.findByIdAndUpdate(stock._id, {
            ltp: ltpData.ltp,
            lastUpdated: new Date(),
          });
        }
      } catch (ltpError) {
        logger.warn('Failed to fetch fresh LTP from AngelOne:', ltpError.message);
      }
    }

    return successResponse(res, 'LTP fetched', liveData);
  } catch (error) {
    logger.error('getLTP error:', error.message);
    return errorResponse(res, 'Failed to fetch LTP', 500);
  }
};

/**
 * @route   GET /api/stocks/:id/candles
 * @desc    Get OHLC candle data — tries AngelOne API, falls back to stored candles
 * @access  Private
 */
const getCandles = async (req, res) => {
  try {
    const { interval = 'ONE_MINUTE', limit = 500 } = req.query;

    const stock = await Stock.findOne({ _id: req.params.id, isActive: true });
    if (!stock) return errorResponse(res, 'Stock not found', 404);

    // --- Try AngelOne historical API first ---
    if (angeloneConfig.isSessionValid()) {
      try {
        const now = new Date();
        const daysBack = daysBackForInterval[interval] || 1;
        const fromDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

        const session = angeloneConfig.getSession();
        const data = await angeloneService.getHistoricalData(
          {
            exchange: stock.exchange,
            symboltoken: stock.token,
            interval,
            fromdate: toISTString(fromDate),
            todate: toISTString(now),
          },
          session.jwtToken
        );

        // AngelOne returns [[timestamp, open, high, low, close, volume], ...]
        const candles = (data || []).map(([ts, o, h, l, c, v]) => ({
          time: Math.floor(new Date(ts).getTime() / 1000),
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c),
          volume: Number(v),
        }));

        return successResponse(res, 'Candles fetched from AngelOne', {
          symbol: stock.symbol,
          exchange: stock.exchange,
          interval,
          source: 'angelone',
          candles,
        });
      } catch (angelErr) {
        logger.warn('AngelOne candle fetch failed, falling back to stored:', angelErr.message);
      }
    }

    // --- Fallback: stored candles from MongoDB ---
    const storedInterval = angeloneToStoredInterval[interval] || '1min';
    const stored = await StockCandle.find({ token: stock.token, interval: storedInterval })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    const candles = stored
      .reverse()
      .map((c) => ({
        time: Math.floor(new Date(c.timestamp).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

    return successResponse(res, 'Candles fetched from store', {
      symbol: stock.symbol,
      exchange: stock.exchange,
      interval,
      source: 'stored',
      candles,
    });
  } catch (error) {
    logger.error('getCandles error:', error.message);
    return errorResponse(res, 'Failed to fetch candles', 500);
  }
};

module.exports = {
  getActiveStocks,
  getStockById,
  getStockBySymbol,
  searchStocks,
  searchAngelOne,
  getHistoricalData,
  getLTP,
  getCandles,
};
