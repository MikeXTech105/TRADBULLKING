const mongoose = require('mongoose');

const leaderboardHistorySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    entries: [
      {
        rank: { type: Number },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        name: { type: String },
        totalPnl: { type: Number },
        totalTrades: { type: Number },
        isDummy: { type: Boolean, default: false },
      },
    ],
    totalParticipants: { type: Number, default: 0 },
  },
  { timestamps: true }
);

leaderboardHistorySchema.index({ date: -1 });

module.exports = mongoose.model('LeaderboardHistory', leaderboardHistorySchema);
