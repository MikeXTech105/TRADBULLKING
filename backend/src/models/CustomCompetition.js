const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
  dailyPnl: { type: Number, default: 0 }, // snapshot at competition close
}, { _id: false });

const customCompetitionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  maxUsers: { type: Number, required: true, min: 2 },
  entryFee: { type: Number, required: true, min: 1 },
  adminPercentage: { type: Number, required: true, default: 3, min: 0, max: 100 },
  status: { type: String, enum: ['OPEN', 'FULL', 'COMPLETED'], default: 'OPEN' },
  participants: [participantSchema],
  participantCount: { type: Number, default: 0 },
  prizePool: { type: Number, default: 0 },    // calculated at creation
  adminCut: { type: Number, default: 0 },     // calculated at creation
  winner: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: null },
    dailyPnl: { type: Number, default: null },
    prize: { type: Number, default: null },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true }, // the calendar day this competition runs
  completedAt: { type: Date, default: null },
}, { timestamps: true });

customCompetitionSchema.index({ status: 1, date: -1 });
customCompetitionSchema.index({ 'participants.userId': 1 });

module.exports = mongoose.model('CustomCompetition', customCompetitionSchema);
