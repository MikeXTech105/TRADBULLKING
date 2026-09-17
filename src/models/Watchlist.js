const mongoose = require('mongoose');

const watchlistItemSchema = new mongoose.Schema(
  {
    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    token: {
      type: String,
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const watchlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    stocks: [watchlistItemSchema],
  },
  {
    timestamps: true,
  }
);

watchlistSchema.index({ userId: 1 });
watchlistSchema.index({ 'stocks.stockId': 1 });

const Watchlist = mongoose.model('Watchlist', watchlistSchema);
module.exports = Watchlist;
