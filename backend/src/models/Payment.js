const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be positive'],
    },
    platformFee: {
      type: Number,
      required: [true, 'Platform fee is required'],
    },
    creditAmount: {
      type: Number,
      required: [true, 'Credit amount is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    cashfreeOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    cashfreePaymentId: {
      type: String,
      default: null,
    },
    paymentLink: {
      type: String,
      default: null,
    },
    customerName: {
      type: String,
    },
    customerEmail: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    webhookData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ cashfreeOrderId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
