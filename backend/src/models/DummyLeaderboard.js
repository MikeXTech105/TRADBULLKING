const mongoose = require('mongoose');

const dummyLeaderboardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    profilePic: {
      type: String,
      default: null,
    },
    totalPnl: {
      type: Number,
      required: [true, 'Total P&L is required'],
      default: 0,
    },
    totalTrades: {
      type: Number,
      default: 0,
      min: 0,
    },
    winRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    winAmount: {
      type: Number,
      default: 0,
    },
    lossAmount: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    rank: {
      type: Number,
      default: null,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

dummyLeaderboardSchema.index({ isVisible: 1, totalPnl: -1 });
dummyLeaderboardSchema.index({ rank: 1 });

const DummyLeaderboard = mongoose.model('DummyLeaderboard', dummyLeaderboardSchema);
module.exports = DummyLeaderboard;
