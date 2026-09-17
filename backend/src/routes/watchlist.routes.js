const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlist.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Watchlist
 *   description: User watchlist management
 */

/**
 * @swagger
 * /watchlist:
 *   get:
 *     summary: Get user's watchlist with live prices
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watchlist with live stock prices
 */
router.get('/', watchlistController.getWatchlist);

/**
 * @swagger
 * /watchlist/add:
 *   post:
 *     summary: Add a stock to watchlist
 *     tags: [Watchlist]
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
 *             properties:
 *               stockId:
 *                 type: string
 *                 description: MongoDB ID of the stock
 *                 example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       201:
 *         description: Stock added to watchlist
 *       404:
 *         description: Stock not found
 *       409:
 *         description: Stock already in watchlist
 */
router.post('/add', watchlistController.addToWatchlist);

/**
 * @swagger
 * /watchlist/clear:
 *   delete:
 *     summary: Clear entire watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watchlist cleared
 */
router.delete('/clear', watchlistController.clearWatchlist);

/**
 * @swagger
 * /watchlist/{stockId}:
 *   delete:
 *     summary: Remove a stock from watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stockId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the stock to remove
 *     responses:
 *       200:
 *         description: Stock removed from watchlist
 *       404:
 *         description: Stock not found in watchlist
 */
router.delete('/:stockId', watchlistController.removeFromWatchlist);

module.exports = router;
