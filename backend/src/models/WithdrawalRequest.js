const mongoose = require('mongoose');
const withdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: [1000, 'Minimum withdrawal is ₹1000'] },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  bankDetails: {
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    accountName: { type: String, required: true },
    bankName: { type: String, required: true },
  },
  rejectionReason: { type: String, default: null },
  processedAt: { type: Date, default: null },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
withdrawalSchema.index({ userId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1 });
module.exports = mongoose.model('WithdrawalRequest', withdrawalSchema);
