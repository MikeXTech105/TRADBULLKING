const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: [true, 'Stock ID is required'],
    },
    symbol: {
      type: String,
      required: [true, 'Symbol is required'],
      uppercase: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
    },
    exchange: {
      type: String,
      required: [true, 'Exchange is required'],
      enum: ['NSE', 'BSE', 'NFO', 'MCX'],
    },
    orderType: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: [true, 'Order type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    limitPrice: {
      type: Number,
      default: null,
    },
    priceType: {
      type: String,
      enum: ['MARKET', 'LIMIT'],
      default: 'MARKET',
    },
    status: {
      type: String,
      enum: ['PENDING', 'EXECUTED', 'CANCELLED', 'FAILED'],
      default: 'PENDING',
    },
    totalValue: {
      type: Number, // quantity * price
    },
    pnl: {
      type: Number,
      default: null, // For SELL orders, realized P&L
    },
    feesDeducted: {
      type: Number,
      default: 2,
    },
    failureReason: {
      type: String,
      default: null,
    },
    executedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ stockId: 1 });
orderSchema.index({ symbol: 1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
