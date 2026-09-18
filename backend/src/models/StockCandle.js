const mongoose = require('mongoose');

const stockCandleSchema = new mongoose.Schema({
  token: { type: String, required: true, index: true },
  symbol: { type: String, required: true },
  exchange: { type: String, required: true },
  interval: { type: String, default: '1min' }, // '1min', '5min', '15min', '30min', '1hr', '1day'
  timestamp: { type: Date, required: true },
  open: { type: Number, required: true },
  high: { type: Number, required: true },
  low: { type: Number, required: true },
  close: { type: Number, required: true },
  volume: { type: Number, default: 0 },
}, { timestamps: false });

stockCandleSchema.index({ token: 1, interval: 1, timestamp: -1 });

module.exports = mongoose.model('StockCandle', stockCandleSchema);
