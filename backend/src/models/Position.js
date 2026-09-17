const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    avgBuyPrice: {
      type: Number,
      required: [true, 'Average buy price is required'],
      min: [0, 'Average buy price cannot be negative'],
    },
    currentPrice: {
      type: Number,
      default: 0,
    },
    investedAmount: {
      type: Number, // quantity * avgBuyPrice
      default: 0,
    },
    currentValue: {
      type: Number, // quantity * currentPrice
      default: 0,
    },
    unrealizedPnl: {
      type: Number,
      default: 0,
    },
    realizedPnl: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'OPEN',
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique open position per user per stock
positionSchema.index({ userId: 1, stockId: 1, status: 1 });
positionSchema.index({ userId: 1, status: 1 });
positionSchema.index({ symbol: 1 });

const Position = mongoose.model('Position', positionSchema);
module.exports = Position;
