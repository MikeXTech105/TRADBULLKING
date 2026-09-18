const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Position = require('../models/Position');
const LeaderboardHistory = require('../models/LeaderboardHistory');
const logger = require('../utils/logger');
const { DUMMY_BALANCE } = require('../utils/constants');
const tradeService = require('./trade.service');

const INSTRUMENTS_FILE = path.join(__dirname, '../../angelone_instruments.json');

// =================== INSTRUMENTS CACHE ===================

const refreshInstrumentsCache = async () => {
  try {
    logger.info('Refreshing AngelOne instruments cache...');
    const angeloneService = require('./angelone.service');
    const instruments = await angeloneService.getAllInstruments();
    fs.writeFileSync(INSTRUMENTS_FILE, JSON.stringify(instruments, null, 2), 'utf8');
    logger.info(`AngelOne instruments cache updated: ${instruments.length} instruments saved`);
  } catch (error) {
    logger.error('refreshInstrumentsCache error:', error.message);
  }
};

// =================== DUMMY USER SIMULATION ===================

const DUMMY_NAMES = [
  'Arjun Mehta', 'Priya Sharma', 'Rohit Verma', 'Sneha Patel', 'Vikram Singh',
  'Ananya Joshi', 'Karan Malhotra', 'Pooja Nair', 'Rahul Gupta', 'Divya Reddy',
  'Amit Tiwari', 'Neha Agarwal', 'Suresh Kumar', 'Kavita Rao', 'Deepak Yadav',
  'Meera Iyer', 'Aakash Bansal', 'Ritu Sinha', 'Manoj Pandey', 'Simran Kaur',
];

const randBetween = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(randBetween(min, max + 1));

/**
 * Check if current time is within Indian market hours (Mon–Fri, 9:15–15:30 IST).
 */
const isMarketHours = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const totalMin = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return totalMin >= 555 && totalMin <= 930; // 9:15 to 15:30
};

/**
 * Simulate real trades for all dummy users via the actual trade service.
 * - SELL: any open position held > 30 min, or 40% random chance each cycle
 * - BUY: if no open positions, or randomly (30% chance) for up to 3 concurrent positions
 * Only runs during market hours on weekdays.
 */
const runDummyUserTrades = async () => {
  if (!isMarketHours()) return;

  try {
    const dummies = await User.find({ isDummy: true, isActive: true });
    if (!dummies.length) return;

    // Only active stocks with a live price
    const activeStocks = await Stock.find({ isActive: true, ltp: { $gt: 0 } });
    if (!activeStocks.length) {
      logger.warn('Dummy trade skipped: no active stocks with live price');
      return;
    }

    let buyCount = 0;
    let sellCount = 0;

    for (const dummy of dummies) {
      try {
        // --- SELL phase ---
        const openPositions = await Position.find({ userId: dummy._id, status: 'OPEN' });

        for (const pos of openPositions) {
          const heldMinutes = (Date.now() - new Date(pos.createdAt).getTime()) / 60000;
          // Sell if held > 30 min OR 40% random chance each cycle
          const shouldSell = heldMinutes > 30 || Math.random() < 0.4;

          if (shouldSell) {
            try {
              await tradeService.placeSellOrder(dummy._id, pos.stockId, pos.quantity);
              sellCount++;
            } catch (e) {
              logger.warn(`Dummy SELL failed [${dummy.name}]: ${e.message}`);
            }
          }
        }

        // --- BUY phase ---
        const currentOpenCount = await Position.countDocuments({
          userId: dummy._id,
          status: 'OPEN',
        });

        // Buy if: no open positions OR randomly open a 2nd/3rd position (max 3)
        const shouldBuy =
          currentOpenCount === 0 || (currentOpenCount < 3 && Math.random() < 0.3);

        if (shouldBuy) {
          // Refresh dummy balance from DB after sells
          const freshUser = await User.findById(dummy._id).select('dummyBalance');
          const balance = freshUser?.dummyBalance || 0;

          // Filter stocks affordable with at least 1 qty
          const affordable = activeStocks.filter((s) => s.ltp > 0 && balance >= s.ltp);
          if (!affordable.length) continue;

          const stock = affordable[randInt(0, affordable.length - 1)];

          // Buy 1–10 qty, but never use more than 20% of balance per trade
          const maxAffordableQty = Math.floor((balance * 0.2) / stock.ltp);
          const qty = randInt(1, Math.max(1, Math.min(10, maxAffordableQty)));

          try {
            await tradeService.placeBuyOrder(dummy._id, stock._id, qty);
            buyCount++;
          } catch (e) {
            logger.warn(`Dummy BUY failed [${dummy.name}]: ${e.message}`);
          }
        }
      } catch (e) {
        logger.warn(`Dummy trade cycle error [${dummy.name}]: ${e.message}`);
      }
    }

    logger.info(
      `Dummy trade simulation complete — ${buyCount} buys, ${sellCount} sells across ${dummies.length} dummy users`
    );
  } catch (error) {
    logger.error('runDummyUserTrades error:', error.message);
  }
};

/**
 * Add new dummy users to the User collection if count is below threshold.
 * Creates real User documents so all trade/position/leaderboard flows work identically.
 */
const addDummyLeaderboardEntries = async () => {
  try {
    const count = await User.countDocuments({ isDummy: true, isActive: true });

    if (count >= 15) {
      logger.info(`Dummy users already at ${count}, skipping creation`);
      return;
    }

    const toAdd = randInt(1, 3);
    const usedNames = (await User.distinct('name', { isDummy: true })) || [];
    const availableNames = DUMMY_NAMES.filter((n) => !usedNames.includes(n));

    if (!availableNames.length) {
      logger.info('No new dummy names available to add');
      return;
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Dummy@123456', salt);

    let created = 0;
    for (let i = 0; i < Math.min(toAdd, availableNames.length); i++) {
      const name = availableNames[i];
      // Seed realistic starting stats so they look active from day 1
      const totalTrades = randInt(20, 120);
      const winAmount = parseFloat(randBetween(50000, 800000).toFixed(2));
      const lossAmount = parseFloat(randBetween(20000, winAmount * 0.7).toFixed(2));

      try {
        await User.create({
          name,
          email: `dummy_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@tradbull.internal`,
          password: hashedPassword,
          role: 'user',
          isDummy: true,
          isActive: true,
          isPremium: true,
          dummyBalance: DUMMY_BALANCE,
          feeBalance: 999999, // never runs out — dummy users always can trade
          totalPnl: parseFloat((winAmount - lossAmount).toFixed(2)),
          totalTrades,
        });
        created++;
      } catch (e) {
        logger.warn(`Failed to create dummy user [${name}]: ${e.message}`);
      }
    }

    logger.info(`Added ${created} new dummy users to User collection`);
  } catch (error) {
    logger.error('addDummyLeaderboardEntries error:', error.message);
  }
};

// =================== LEADERBOARD ===================

const snapshotLeaderboard = async () => {
  try {
    const allUsers = await User.find({
      role: 'user',
      isActive: true,
      $or: [{ isPremium: true }, { isDummy: true }],
    }).select('name totalPnl totalTrades isDummy');

    const combined = allUsers
      .map((u) => ({
        userId: u.isDummy ? null : u._id,
        name: u.name,
        totalPnl: u.totalPnl,
        totalTrades: u.totalTrades,
        isDummy: u.isDummy,
      }))
      .sort((a, b) => b.totalPnl - a.totalPnl);

    const entries = combined.map((entry, idx) => ({ rank: idx + 1, ...entry }));

    await LeaderboardHistory.create({
      date: new Date(),
      entries,
      totalParticipants: entries.length,
    });

    logger.info(`Leaderboard snapshot saved: ${entries.length} entries`);
  } catch (error) {
    logger.error('snapshotLeaderboard error:', error.message);
  }
};

/**
 * Close open positions only for real (non-dummy) premium users at daily reset.
 * Dummy users keep their positions across days — they trade continuously.
 */
const closeOpenPositions = async () => {
  try {
    // Get only real (non-dummy) premium user IDs
    const realUsers = await User.find({
      role: 'user',
      isActive: true,
      isPremium: true,
      isDummy: { $ne: true },
    }).select('_id');

    const userIds = realUsers.map((u) => u._id);

    const result = await Position.updateMany(
      { userId: { $in: userIds }, status: 'OPEN' },
      { $set: { status: 'CLOSED', closedAt: new Date(), unrealizedPnl: 0 } }
    );

    logger.info(`Closed ${result.modifiedCount} open positions for daily reset (real users only)`);
  } catch (error) {
    logger.error('closeOpenPositions error:', error.message);
  }
};

/**
 * Reset balance and stats for real premium users only.
 * Dummy users are excluded — their PnL accumulates continuously for the leaderboard.
 */
const resetPremiumUsers = async () => {
  try {
    const result = await User.updateMany(
      { role: 'user', isActive: true, isPremium: true, isDummy: { $ne: true } },
      { $set: { dummyBalance: DUMMY_BALANCE, totalPnl: 0, totalTrades: 0 } }
    );
    logger.info(`Daily reset: ${result.modifiedCount} real premium users reset`);
  } catch (error) {
    logger.error('resetPremiumUsers error:', error.message);
  }
};

// =================== SCHEDULER INIT ===================

const startDailyScheduler = () => {
  // Refresh AngelOne instruments cache every 24 hours at 6 AM
  cron.schedule('0 6 * * *', async () => {
    await refreshInstrumentsCache();
  });

  // Run once on startup so the cache is available immediately
  refreshInstrumentsCache();

  // Simulate dummy user trades every 15 minutes (market hours only)
  cron.schedule('*/15 * * * *', async () => {
    await runDummyUserTrades();
  });

  // Add new dummy users every weekday at 8 AM (before market opens)
  cron.schedule('0 8 * * 1-5', async () => {
    await addDummyLeaderboardEntries();
  });

  // Daily reset at midnight — snapshot leaderboard, close real positions, reset real users
  cron.schedule('0 0 * * *', async () => {
    logger.info('=== Daily leaderboard & balance reset started ===');
    await snapshotLeaderboard();
    await closeOpenPositions();
    await resetPremiumUsers();
    logger.info('=== Daily leaderboard & balance reset completed ===');
  });

  // Auto-refresh AngelOne session every 22 hours
  cron.schedule('0 */22 * * *', async () => {
    const angeloneConfig = require('../config/angelone');
    const wsService = require('./websocket.service');
    if (!angeloneConfig.isSessionValid()) {
      logger.info('AngelOne session expired, attempting auto-refresh...');
      try {
        await angeloneConfig.refreshSession();
        const session = angeloneConfig.getSession();
        if (session.jwtToken && session.feedToken && session.clientCode) {
          await wsService.connect(session.jwtToken, session.feedToken, session.clientCode);
          logger.info('AngelOne session auto-refreshed and WebSocket reconnected');
        }
      } catch (err) {
        logger.error('AngelOne session auto-refresh failed:', err.message);
      }
    }
  });

  logger.info('Scheduler initialized');
};

module.exports = { startDailyScheduler, runDummyUserTrades, addDummyLeaderboardEntries };
