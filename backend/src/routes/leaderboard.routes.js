const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Leaderboard
 *   description: Trading leaderboard endpoints
 */

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     summary: Get combined leaderboard (real users + dummy entries), sorted by total P&L
 *     tags: [Leaderboard]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of entries to return
 *     responses:
 *       200:
 *         description: Ranked leaderboard with P&L, win rate, and trade stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           totalPnl:
 *                             type: number
 *                           totalTrades:
 *                             type: integer
 *                           winRate:
 *                             type: number
 *                           type:
 *                             type: string
 *                             enum: [real, dummy]
 */
router.get('/', optionalAuth, leaderboardController.getLeaderboard);

/**
 * @swagger
 * /leaderboard/stats:
 *   get:
 *     summary: Get leaderboard statistics (total traders, top gainer, total profit)
 *     tags: [Leaderboard]
 *     security: []
 *     responses:
 *       200:
 *         description: Leaderboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTraders:
 *                       type: integer
 *                     totalPremiumTraders:
 *                       type: integer
 *                     totalProfitGenerated:
 *                       type: number
 *                     topGainer:
 *                       type: object
 */
router.get('/stats', leaderboardController.getLeaderboardStats);

/**
 * @swagger
 * /leaderboard/user/{userId}:
 *   get:
 *     summary: Get public profile and recent trades of a leaderboard user
 *     tags: [Leaderboard]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB user ID
 *     responses:
 *       200:
 *         description: User public profile with 50 most recent executed trades
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', leaderboardController.getUserPublicProfile);

module.exports = router;
