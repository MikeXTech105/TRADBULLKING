const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All stock routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Stocks
 *   description: Stock market data endpoints
 */

/**
 * @swagger
 * /stocks:
 *   get:
 *     summary: Get all active stocks with live prices
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: exchange
 *         schema:
 *           type: string
 *           enum: [NSE, BSE, NFO, MCX]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of active stocks
 */
router.get('/', stockController.getActiveStocks);

/**
 * @swagger
 * /stocks/search:
 *   get:
 *     summary: Search stocks by symbol or name
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (symbol or company name)
 *       - in: query
 *         name: exchange
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results (up to 20 stocks)
 */
router.get('/search', stockController.searchStocks);

/**
 * @swagger
 * /stocks/search-angelone:
 *   post:
 *     summary: Search instruments directly from AngelOne API
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exchange
 *               - searchscrip
 *             properties:
 *               exchange:
 *                 type: string
 *                 example: "NSE"
 *               searchscrip:
 *                 type: string
 *                 example: "RELIANCE"
 *     responses:
 *       200:
 *         description: AngelOne search results
 *       503:
 *         description: AngelOne session not available
 */
router.post('/search-angelone', stockController.searchAngelOne);

/**
 * @swagger
 * /stocks/symbol/{symbol}:
 *   get:
 *     summary: Get stock by trading symbol
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         example: RELIANCE
 *     responses:
 *       200:
 *         description: Stock details
 *       404:
 *         description: Stock not found
 */
router.get('/symbol/:symbol', stockController.getStockBySymbol);

/**
 * @swagger
 * /stocks/{id}/candles:
 *   get:
 *     summary: Get OHLC candle data for a stock
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [ONE_MINUTE, THREE_MINUTE, FIVE_MINUTE, TEN_MINUTE, FIFTEEN_MINUTE, THIRTY_MINUTE, ONE_HOUR, ONE_DAY]
 *           default: ONE_MINUTE
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 500
 *     responses:
 *       200:
 *         description: OHLC candle data
 *       404:
 *         description: Stock not found
 */
router.get('/:id/candles', stockController.getCandles);

/**
 * @swagger
 * /stocks/{id}:
 *   get:
 *     summary: Get stock details by ID
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock details
 *       404:
 *         description: Stock not found
 */
router.get('/:id', stockController.getStockById);

/**
 * @swagger
 * /stocks/{id}/ltp:
 *   get:
 *     summary: Get live LTP for a stock
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fresh
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Fetch fresh price from AngelOne
 *     responses:
 *       200:
 *         description: Live price data
 */
router.get('/:id/ltp', stockController.getLTP);

/**
 * @swagger
 * /stocks/{id}/historical:
 *   get:
 *     summary: Get historical OHLC candle data
 *     tags: [Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: interval
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ONE_MINUTE, THREE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE, THIRTY_MINUTE, ONE_HOUR, ONE_DAY]
 *       - in: query
 *         name: fromdate
 *         required: true
 *         schema:
 *           type: string
 *         example: "2024-01-01 09:15"
 *       - in: query
 *         name: todate
 *         required: true
 *         schema:
 *           type: string
 *         example: "2024-01-31 15:30"
 *     responses:
 *       200:
 *         description: Historical candle data
 *       503:
 *         description: AngelOne session not available
 */
router.get('/:id/historical', stockController.getHistoricalData);

module.exports = router;
