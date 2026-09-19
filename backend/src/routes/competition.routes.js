const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { listOpenCompetitions, myCompetitions, joinCompetition } = require('../controllers/competition.controller');

/**
 * @swagger
 * tags:
 *   name: Competitions
 *   description: Custom paid competitions (admin-created, winner-takes-all)
 */

/**
 * @swagger
 * /competitions:
 *   get:
 *     summary: List all open competitions available to join
 *     tags: [Competitions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of OPEN competitions (not yet full)
 */
router.get('/', authenticate, listOpenCompetitions);

/**
 * @swagger
 * /competitions/my:
 *   get:
 *     summary: Get competitions the current user has joined
 *     tags: [Competitions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's joined competitions with status and results
 */
router.get('/my', authenticate, myCompetitions);

/**
 * @swagger
 * /competitions/{id}/join:
 *   post:
 *     summary: Join a competition by paying the entry fee
 *     tags: [Competitions]
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
 *         description: Successfully joined. Entry fee deducted from withdrawableBalance.
 *       400:
 *         description: Already joined, competition full, or insufficient balance
 *       403:
 *         description: Premium subscription required
 */
router.post('/:id/join', authenticate, joinCompetition);

module.exports = router;
