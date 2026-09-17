const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, canTrade } = require('../middlewares/auth.middleware');
const { placeOrderValidation } = require('../middlewares/validate.middleware');

// All order routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order placement and management
 */

/**
 * @swagger
 * /orders/portfolio/summary:
 *   get:
 *     summary: Get portfolio overview (balance, invested, P&L)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portfolio summary
 */
router.get('/portfolio/summary', orderController.getPortfolioSummary);

/**
 * @swagger
 * /orders/pnl/summary:
 *   get:
 *     summary: Get detailed P&L summary
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: P&L breakdown with win rate, max profit/loss
 */
router.get('/pnl/summary', orderController.getPnlSummary);

/**
 * @swagger
 * /orders/positions/open:
 *   get:
 *     summary: Get all open positions with live unrealized P&L
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Open positions with live prices
 */
router.get('/positions/open', orderController.getOpenPositions);

/**
 * @swagger
 * /orders/positions/closed:
 *   get:
 *     summary: Get closed positions history
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated closed positions
 */
router.get('/positions/closed', orderController.getClosedPositions);

/**
 * @swagger
 * /orders/buy:
 *   post:
 *     summary: Place a BUY order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stockId
 *               - orderType
 *               - quantity
 *             properties:
 *               stockId:
 *                 type: string
 *                 description: MongoDB ID of the stock
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 10
 *               priceType:
 *                 type: string
 *                 enum: [MARKET, LIMIT]
 *                 default: MARKET
 *               limitPrice:
 *                 type: number
 *                 description: Required if priceType is LIMIT
 *     responses:
 *       201:
 *         description: Buy order executed
 *       400:
 *         description: Insufficient balance or invalid request
 *       403:
 *         description: Cannot trade - trial expired or fee balance empty
 */
router.post('/buy', canTrade, placeOrderValidation, orderController.placeBuyOrder);

/**
 * @swagger
 * /orders/sell:
 *   post:
 *     summary: Place a SELL order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stockId
 *               - orderType
 *               - quantity
 *             properties:
 *               stockId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               priceType:
 *                 type: string
 *                 enum: [MARKET, LIMIT]
 *               limitPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Sell order executed with realized P&L
 *       400:
 *         description: Insufficient position quantity
 *       403:
 *         description: Cannot trade
 */
router.post('/sell', canTrade, placeOrderValidation, orderController.placeSellOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get order history
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: orderType
 *         schema:
 *           type: string
 *           enum: [BUY, SELL]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, EXECUTED, CANCELLED, FAILED]
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated order history
 */
router.get('/', orderController.getOrderHistory);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Orders]
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
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', orderController.getOrderById);

module.exports = router;
