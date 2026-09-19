const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const stockRoutes = require('./stock.routes');
const orderRoutes = require('./order.routes');
const watchlistRoutes = require('./watchlist.routes');
const paymentRoutes = require('./payment.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const withdrawalRoutes = require('./withdrawal.routes');
const competitionRoutes = require('./competition.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/stocks', stockRoutes);
router.use('/orders', orderRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/payments', paymentRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/competitions', competitionRoutes);

// API info route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Trading App API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      stocks: '/api/stocks',
      orders: '/api/orders',
      watchlist: '/api/watchlist',
      payments: '/api/payments',
      leaderboard: '/api/leaderboard',
      withdrawals: '/api/withdrawals',
      competitions: '/api/competitions',
      docs: '/api-docs',
    },
  });
});

module.exports = router;
