const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const User = require('../models/User');
const cashfreeService = require('../services/cashfree.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');
const {
  PAYMENT_AMOUNT,
  PLATFORM_FEE,
  CREDIT_AMOUNT,
  DUMMY_BALANCE,
  REFERRAL_BONUS,
} = require('../utils/constants');

/**
 * Credit referral bonus to referrer on first successful payment
 */
const creditReferralBonus = async (userId) => {
  try {
    const user = await User.findById(userId).select('referredBy isPremium');
    if (!user || !user.referredBy) return;
    // Check if this is first successful payment (count SUCCESS payments for this user)
    const successCount = await Payment.countDocuments({ userId, status: 'SUCCESS' });
    if (successCount !== 1) return; // Only on the very first payment
    // Credit bonus to referrer
    await User.findByIdAndUpdate(user.referredBy, {
      $inc: { withdrawableBalance: REFERRAL_BONUS },
    });
    logger.info(`Referral bonus of ₹${REFERRAL_BONUS} credited to referrer for user ${userId}`);
  } catch (e) {
    logger.error('creditReferralBonus error:', e.message);
  }
};

/**
 * @route   POST /api/payments/create
 * @desc    Create a Cashfree payment order for subscription
 * @access  Private
 */
const createPaymentOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Generate unique order ID
    const orderId = `PAY_${user._id.toString().slice(-8).toUpperCase()}_${Date.now()}`;

    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/verify?order_id=${orderId}`;

    // Call Cashfree to create order
    const cashfreeOrder = await cashfreeService.createOrder({
      orderId,
      amount: PAYMENT_AMOUNT, // ₹500
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || '9999999999',
      returnUrl,
    });

    // Save payment record
    const payment = new Payment({
      userId: user._id,
      amount: PAYMENT_AMOUNT,
      platformFee: PLATFORM_FEE,
      creditAmount: CREDIT_AMOUNT,
      status: 'PENDING',
      cashfreeOrderId: orderId,
      paymentLink: cashfreeOrder.paymentLink,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || '9999999999',
    });

    await payment.save();

    logger.info(`Payment order created for user ${user.email}: ${orderId}`);

    return successResponse(res, 'Payment order created successfully', {
      orderId,
      amount: PAYMENT_AMOUNT,
      paymentSessionId: cashfreeOrder.paymentSessionId,
      paymentLink: cashfreeOrder.paymentLink,
      breakdown: {
        totalAmount: PAYMENT_AMOUNT,
        platformFee: PLATFORM_FEE,
        creditToFeeBalance: CREDIT_AMOUNT,
        dummyBalanceOnSuccess: DUMMY_BALANCE,
      },
    }, 201);
  } catch (error) {
    logger.error('createPaymentOrder error:', error.message);
    return errorResponse(res, `Payment order creation failed: ${error.message}`, 500);
  }
};

/**
 * @route   POST /api/payments/verify/:orderId
 * @desc    Verify payment status and activate premium
 * @access  Private
 */
const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find payment record
    const payment = await Payment.findOne({
      cashfreeOrderId: orderId,
      userId: req.user._id,
    });

    if (!payment) {
      return errorResponse(res, 'Payment record not found', 404);
    }

    if (payment.status === 'SUCCESS') {
      return successResponse(res, 'Payment already verified and activated', {
        orderId,
        status: 'SUCCESS',
        isPremium: true,
      });
    }

    // Check payment status with Cashfree
    const orderStatus = await cashfreeService.getOrderStatus(orderId);

    if (orderStatus.orderStatus === 'PAID') {
      // Payment successful - activate premium
      const user = await User.findById(req.user._id);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Activate premium
      user.isPremium = true;
      user.dummyBalance = DUMMY_BALANCE; // 5 crore
      user.feeBalance = CREDIT_AMOUNT; // ₹401

      await user.save();

      // Update payment record
      payment.status = 'SUCCESS';
      payment.paidAt = new Date();
      payment.cashfreePaymentId = orderStatus.cfOrderId || orderId;
      await payment.save();

      await creditReferralBonus(user._id);

      logger.info(`Payment verified and premium activated for user: ${user.email}`);

      return successResponse(res, 'Payment successful! Premium activated.', {
        orderId,
        status: 'SUCCESS',
        isPremium: true,
        dummyBalance: user.dummyBalance,
        feeBalance: user.feeBalance,
        message: `You now have ₹${DUMMY_BALANCE.toLocaleString('en-IN')} for paper trading and ₹${CREDIT_AMOUNT} fee balance.`,
      });
    } else if (orderStatus.orderStatus === 'ACTIVE') {
      return successResponse(res, 'Payment is pending', {
        orderId,
        status: 'PENDING',
        cashfreeStatus: orderStatus.orderStatus,
      });
    } else {
      // Payment failed
      payment.status = 'FAILED';
      payment.failureReason = `Payment status: ${orderStatus.orderStatus}`;
      await payment.save();

      return successResponse(res, 'Payment failed or expired', {
        orderId,
        status: 'FAILED',
        cashfreeStatus: orderStatus.orderStatus,
      });
    }
  } catch (error) {
    logger.error('verifyPayment error:', error.message);
    return errorResponse(res, `Payment verification failed: ${error.message}`, 500);
  }
};

/**
 * @route   POST /api/payments/webhook
 * @desc    Cashfree webhook for payment notifications
 * @access  Public (webhook)
 */
const paymentWebhook = async (req, res) => {
  try {
    // Get signature and timestamp from headers
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = cashfreeService.verifyWebhookSignature(rawBody, signature, timestamp);

    if (!isValid) {
      logger.warn('Invalid Cashfree webhook signature received');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const webhookData = req.body;
    const { data } = webhookData;

    if (!data || !data.order) {
      return res.status(400).json({ success: false, message: 'Invalid webhook data' });
    }

    const orderId = data.order.order_id;
    const orderStatus = data.order.order_status;

    logger.info(`Cashfree webhook received: Order ${orderId}, Status: ${orderStatus}`);

    // Find payment record
    const payment = await Payment.findOne({ cashfreeOrderId: orderId });

    if (!payment) {
      logger.warn(`Webhook: Payment record not found for order ${orderId}`);
      return res.status(200).json({ success: true, message: 'Acknowledged' });
    }

    if (payment.status === 'SUCCESS') {
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // Store webhook data
    payment.webhookData = webhookData;

    if (orderStatus === 'PAID') {
      // Activate premium
      const user = await User.findById(payment.userId);

      if (user) {
        user.isPremium = true;
        user.dummyBalance = DUMMY_BALANCE;
        user.feeBalance = CREDIT_AMOUNT;
        await user.save();

        payment.status = 'SUCCESS';
        payment.paidAt = new Date();
        payment.cashfreePaymentId = data.payment?.cf_payment_id || orderId;

        logger.info(`Webhook: Premium activated for user ${user.email}`);
      }
    } else if (['EXPIRED', 'CANCELLED'].includes(orderStatus)) {
      payment.status = 'FAILED';
      payment.failureReason = `Payment ${orderStatus.toLowerCase()}`;
    }

    await payment.save();

    if (orderStatus === 'PAID') {
      await creditReferralBonus(payment.userId);
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('paymentWebhook error:', error.message);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

/**
 * @route   GET /api/payments/history
 * @desc    Get user's payment history
 * @access  Private
 */
const getPaymentHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Payment.countDocuments({ userId: req.user._id });
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-webhookData');

    return paginatedResponse(res, 'Payment history fetched', payments, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('getPaymentHistory error:', error.message);
    return errorResponse(res, 'Failed to fetch payment history', 500);
  }
};

/**
 * @route   GET /api/payments/:orderId
 * @desc    Get payment details
 * @access  Private
 */
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      cashfreeOrderId: req.params.orderId,
      userId: req.user._id,
    }).select('-webhookData');

    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    return successResponse(res, 'Payment details fetched', payment);
  } catch (error) {
    logger.error('getPaymentDetails error:', error.message);
    return errorResponse(res, 'Failed to fetch payment details', 500);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  paymentWebhook,
  getPaymentHistory,
  getPaymentDetails,
};
