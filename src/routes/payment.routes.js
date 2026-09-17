const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Subscription payment endpoints
 */

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Cashfree payment webhook (called by Cashfree, not users)
 *     tags: [Payments]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid signature
 */
router.post('/webhook', paymentController.paymentWebhook);

// All other payment routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: Create a payment order (₹500 subscription)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Payment order created with session ID
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
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                       example: 500
 *                     paymentSessionId:
 *                       type: string
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         totalAmount:
 *                           type: number
 *                           example: 500
 *                         platformFee:
 *                           type: number
 *                           example: 99
 *                         creditToFeeBalance:
 *                           type: number
 *                           example: 401
 *                         dummyBalanceOnSuccess:
 *                           type: number
 *                           example: 50000000
 */
router.post('/create', paymentController.createPaymentOrder);

/**
 * @swagger
 * /payments/verify/{orderId}:
 *   post:
 *     summary: Verify payment and activate premium subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cashfree order ID
 *     responses:
 *       200:
 *         description: Payment verified - premium activated with ₹5 crore balance
 *       404:
 *         description: Payment record not found
 */
router.post('/verify/:orderId', paymentController.verifyPayment);

/**
 * @swagger
 * /payments/history:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
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
 *         description: Payment history
 */
router.get('/history', paymentController.getPaymentHistory);

/**
 * @swagger
 * /payments/{orderId}:
 *   get:
 *     summary: Get payment details by order ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 */
router.get('/:orderId', paymentController.getPaymentDetails);

module.exports = router;
