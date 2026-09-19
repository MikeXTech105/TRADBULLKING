const mongoose = require('mongoose');
const competitionResultSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  results: [{
    rank: Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    dailyPnl: Number,
    prize: Number,
  }],
  totalParticipants: { type: Number, default: 0 },
  announcedAt: { type: Date, default: Date.now },
}, { timestamps: true });
competitionResultSchema.index({ date: -1 });
module.exports = mongoose.model('CompetitionResult', competitionResultSchema);
