const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { requestWithdrawal, getWithdrawalHistory, getWithdrawableBalance } = require('../controllers/withdrawal.controller');

router.use(authenticate);

/**
 * @swagger
 * /withdrawals/balance:
 *   get:
 *     summary: Get withdrawable balance
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current withdrawable balance (competition prizes + referral bonuses only)
 */
router.get('/balance', getWithdrawableBalance);

/**
 * @swagger
 * /withdrawals/request:
 *   post:
 *     summary: Request a withdrawal
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - bankDetails
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1000
 *                 example: 1500
 *                 description: Minimum ₹1000. Must not exceed withdrawableBalance.
 *               bankDetails:
 *                 type: object
 *                 required: [accountNumber, ifsc, accountName, bankName]
 *                 properties:
 *                   accountNumber:
 *                     type: string
 *                     example: "1234567890"
 *                   ifsc:
 *                     type: string
 *                     example: "HDFC0001234"
 *                   accountName:
 *                     type: string
 *                     example: "John Doe"
 *                   bankName:
 *                     type: string
 *                     example: "HDFC Bank"
 *     responses:
 *       201:
 *         description: Withdrawal auto-approved. Amount deducted from withdrawableBalance immediately.
 *       400:
 *         description: Insufficient balance or below minimum ₹1,000
 */
router.post('/request', requestWithdrawal);

/**
 * @swagger
 * /withdrawals/history:
 *   get:
 *     summary: Get withdrawal history
 *     tags: [Withdrawals]
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated withdrawal history
 */
router.get('/history', getWithdrawalHistory);

module.exports = router;
