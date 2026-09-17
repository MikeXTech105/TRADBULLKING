const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');
const { addStockValidation, addDummyLeaderboardValidation } = require('../middlewares/validate.middleware');

// All admin routes require authentication and admin role
router.use(authenticate, isAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints
 */

// =================== DASHBOARD ===================

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats including users, orders, revenue
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', adminController.getDashboard);

// =================== USER MANAGEMENT ===================

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with optional filters
 *     tags: [Admin]
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
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [premium, trial, expired]
 *     responses:
 *       200:
 *         description: Paginated list of users
 */
router.get('/users', adminController.getAllUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin]
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
 *         description: User details and stats
 *       404:
 *         description: User not found
 */
router.get('/users/:id', adminController.getUserDetail);

/**
 * @swagger
 * /admin/users/{id}/trades:
 *   get:
 *     summary: Get a user's trade history
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: User's trade history
 */
router.get('/users/:id/trades', adminController.getUserTrades);

/**
 * @swagger
 * /admin/users/{id}/pnl:
 *   get:
 *     summary: Get a user's P&L summary
 *     tags: [Admin]
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
 *         description: User's P&L breakdown
 */
router.get('/users/:id/pnl', adminController.getUserPnl);

/**
 * @swagger
 * /admin/users/{id}/toggle-active:
 *   put:
 *     summary: Activate or deactivate a user
 *     tags: [Admin]
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
 *         description: User status toggled
 */
router.put('/users/:id/toggle-active', adminController.toggleUserActive);

// =================== STOCK MANAGEMENT ===================

/**
 * @swagger
 * /admin/stocks:
 *   get:
 *     summary: Get all stocks (including disabled)
 *     tags: [Admin]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: exchange
 *         schema:
 *           type: string
 *           enum: [NSE, BSE, NFO, MCX]
 *     responses:
 *       200:
 *         description: Paginated list of all stocks
 */
router.get('/stocks', adminController.getAllStocks);

/**
 * @swagger
 * /admin/stocks:
 *   post:
 *     summary: Add a new stock
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - token
 *               - exchange
 *               - name
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "RELIANCE"
 *               token:
 *                 type: string
 *                 example: "2885"
 *               exchange:
 *                 type: string
 *                 enum: [NSE, BSE, NFO, MCX]
 *               name:
 *                 type: string
 *                 example: "Reliance Industries Ltd"
 *               exchangeType:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Stock added successfully
 *       409:
 *         description: Stock with this token already exists
 */
router.post('/stocks', addStockValidation, adminController.addStock);

/**
 * @swagger
 * /admin/stocks/{id}:
 *   put:
 *     summary: Update stock details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               high52:
 *                 type: number
 *               low52:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stock updated
 */
router.put('/stocks/:id', adminController.updateStock);

/**
 * @swagger
 * /admin/stocks/{id}/toggle:
 *   put:
 *     summary: Enable or disable a stock (visible to users)
 *     tags: [Admin]
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
 *         description: Stock status toggled
 */
router.put('/stocks/:id/toggle', adminController.toggleStockActive);

/**
 * @swagger
 * /admin/stocks/{id}:
 *   delete:
 *     summary: Delete a stock
 *     tags: [Admin]
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
 *         description: Stock deleted
 *       400:
 *         description: Cannot delete stock with open positions
 */
router.delete('/stocks/:id', adminController.deleteStock);

/**
 * @swagger
 * /admin/stocks/sync-prices:
 *   post:
 *     summary: Sync live prices for all active stocks from AngelOne
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prices synced
 *       503:
 *         description: AngelOne session not available
 */
router.post('/stocks/sync-prices', adminController.syncStockPrices);

// =================== ANGELONE SESSION ===================

/**
 * @swagger
 * /admin/angelone/session:
 *   post:
 *     summary: Initialize AngelOne session with credentials
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totp
 *             properties:
 *               clientId:
 *                 type: string
 *               password:
 *                 type: string
 *               totp:
 *                 type: string
 *                 description: Time-based OTP from authenticator app
 *     responses:
 *       200:
 *         description: Session initialized, WebSocket connected
 */
router.post('/angelone/session', adminController.initAngelOneSession);

/**
 * @swagger
 * /admin/angelone/instruments:
 *   get:
 *     summary: Fetch all instruments from AngelOne with optional search and filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by symbol, name, or token
 *       - in: query
 *         name: exchange
 *         schema:
 *           type: string
 *           enum: [NSE, BSE, NFO, MCX, CDS]
 *         description: Filter by exchange
 *       - in: query
 *         name: instrumenttype
 *         schema:
 *           type: string
 *           enum: [AMXIDX, OPTIDX, FUTIDX, FUTSTK, OPTSTK, EQ]
 *         description: Filter by instrument type
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
 *     responses:
 *       200:
 *         description: Paginated list of AngelOne instruments
 *       503:
 *         description: Failed to fetch instruments
 */
router.get('/angelone/instruments', adminController.getAngelOneInstruments);

// =================== LEADERBOARD MANAGEMENT ===================

/**
 * @swagger
 * /admin/leaderboard:
 *   get:
 *     summary: Get all dummy leaderboard entries (including hidden)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All dummy entries
 */
router.get('/leaderboard', adminController.getAllDummyLeaderboard);

/**
 * @swagger
 * /admin/leaderboard:
 *   post:
 *     summary: Add a dummy leaderboard entry
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - totalPnl
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rahul Sharma"
 *               profilePic:
 *                 type: string
 *               totalPnl:
 *                 type: number
 *                 example: 1500000
 *               totalTrades:
 *                 type: integer
 *                 example: 125
 *               winRate:
 *                 type: number
 *                 example: 68.5
 *               winAmount:
 *                 type: number
 *               lossAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Dummy entry added
 */
router.post('/leaderboard', addDummyLeaderboardValidation, adminController.addDummyLeaderboard);

/**
 * @swagger
 * /admin/leaderboard/{id}:
 *   put:
 *     summary: Update a dummy leaderboard entry
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               totalPnl:
 *                 type: number
 *               isVisible:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Entry updated
 */
router.put('/leaderboard/:id', adminController.updateDummyLeaderboard);

/**
 * @swagger
 * /admin/leaderboard/{id}:
 *   delete:
 *     summary: Delete a dummy leaderboard entry
 *     tags: [Admin]
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
 *         description: Entry deleted
 */
router.delete('/leaderboard/:id', adminController.deleteDummyLeaderboard);

module.exports = router;
