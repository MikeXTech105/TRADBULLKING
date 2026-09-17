const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Symbol is required'],
      uppercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      trim: true,
    },
    exchange: {
      type: String,
      enum: ['NSE', 'BSE', 'NFO', 'MCX'],
      default: 'NSE',
    },
    exchangeType: {
      type: Number,
      default: 1, // 1=NSE_CM, 3=BSE_CM, 2=NSE_FO, 4=BSE_FO, 5=MCX_FO
    },
    name: {
      type: String,
      required: [true, 'Stock name is required'],
      trim: true,
    },
    ltp: {
      type: Number,
      default: 0,
    },
    change: {
      type: Number,
      default: 0,
    },
    changePercent: {
      type: Number,
      default: 0,
    },
    high52: {
      type: Number,
      default: 0,
    },
    low52: {
      type: Number,
      default: 0,
    },
    high: {
      type: Number,
      default: 0,
    },
    low: {
      type: Number,
      default: 0,
    },
    open: {
      type: Number,
      default: 0,
    },
    close: {
      type: Number,
      default: 0,
    },
    volume: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: false, // Admin must enable
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
stockSchema.index({ token: 1 });
stockSchema.index({ symbol: 1, exchange: 1 });
stockSchema.index({ isActive: 1 });
stockSchema.index({ symbol: 'text', name: 'text' });

const Stock = mongoose.model('Stock', stockSchema);
module.exports = Stock;
