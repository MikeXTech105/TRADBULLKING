const axios = require('axios');
const crypto = require('crypto');
const { getCashfreeHeaders, CASHFREE_BASE_URL, CASHFREE_SECRET_KEY } = require('../config/cashfree');
const logger = require('../utils/logger');

/**
 * Create a Cashfree payment order
 * @param {Object} params
 * @param {string} params.orderId - Unique order ID
 * @param {number} params.amount - Amount in INR
 * @param {string} params.customerName
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 * @param {string} params.returnUrl - Redirect URL after payment
 */
const createOrder = async ({
  orderId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  returnUrl,
}) => {
  try {
    const payload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: orderId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/verify?order_id={order_id}`,
        notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/webhook`,
      },
      order_note: 'Paper Trading Platform Subscription',
    };

    const response = await axios.post(`${CASHFREE_BASE_URL}/orders`, payload, {
      headers: getCashfreeHeaders(),
      timeout: 30000,
    });

    logger.info(`Cashfree order created: ${orderId}`);

    return {
      success: true,
      orderId: response.data.order_id,
      paymentSessionId: response.data.payment_session_id,
      orderStatus: response.data.order_status,
      cfOrderId: response.data.cf_order_id,
      paymentLink: response.data.payment_link || null,
      expiryTime: response.data.order_expiry_time,
    };
  } catch (error) {
    logger.error('Cashfree createOrder error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to create Cashfree order'
    );
  }
};

/**
 * Get status of a Cashfree order
 * @param {string} orderId
 */
const getOrderStatus = async (orderId) => {
  try {
    const response = await axios.get(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
      headers: getCashfreeHeaders(),
      timeout: 30000,
    });

    logger.info(`Cashfree order status fetched: ${orderId} -> ${response.data.order_status}`);

    return {
      success: true,
      orderId: response.data.order_id,
      orderStatus: response.data.order_status,
      orderAmount: response.data.order_amount,
      cfOrderId: response.data.cf_order_id,
      paymentSessionId: response.data.payment_session_id,
      customerDetails: response.data.customer_details,
      orderMeta: response.data.order_meta,
      createdAt: response.data.created_at,
    };
  } catch (error) {
    logger.error('Cashfree getOrderStatus error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to get order status'
    );
  }
};

/**
 * Get payment details for an order
 * @param {string} orderId
 */
const getPayments = async (orderId) => {
  try {
    const response = await axios.get(`${CASHFREE_BASE_URL}/orders/${orderId}/payments`, {
      headers: getCashfreeHeaders(),
      timeout: 30000,
    });

    return {
      success: true,
      payments: response.data,
    };
  } catch (error) {
    logger.error('Cashfree getPayments error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to get payments'
    );
  }
};

/**
 * Verify Cashfree webhook signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} signature - Signature from x-webhook-signature header
 * @param {string} timestamp - Timestamp from x-webhook-timestamp header
 */
const verifyWebhookSignature = (rawBody, signature, timestamp) => {
  try {
    if (!signature || !timestamp) return false;

    // Cashfree signature verification: HMAC-SHA256 of timestamp + rawBody
    const signedPayload = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_SECRET_KEY)
      .update(signedPayload)
      .digest('base64');

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    logger.error('Cashfree webhook signature verification error:', error.message);
    return false;
  }
};

/**
 * Refund a payment
 * @param {string} orderId
 * @param {string} cfPaymentId
 * @param {number} amount
 * @param {string} refundId
 */
const createRefund = async (orderId, cfPaymentId, amount, refundId) => {
  try {
    const payload = {
      refund_amount: amount,
      refund_id: refundId,
      refund_note: 'Refund for paper trading subscription',
    };

    const response = await axios.post(
      `${CASHFREE_BASE_URL}/orders/${orderId}/refunds`,
      payload,
      {
        headers: getCashfreeHeaders(),
        timeout: 30000,
      }
    );

    logger.info(`Cashfree refund created for order: ${orderId}`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error('Cashfree createRefund error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to create refund'
    );
  }
};

module.exports = {
  createOrder,
  getOrderStatus,
  getPayments,
  verifyWebhookSignature,
  createRefund,
};
