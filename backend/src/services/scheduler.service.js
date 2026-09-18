const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Position = require('../models/Position');
const DummyLeaderboard = require('../models/DummyLeaderboard');
const LeaderboardHistory = require('../models/LeaderboardHistory');
const logger = require('../utils/logger');
const { DUMMY_BALANCE } = require('../utils/constants');

const INSTRUMENTS_FILE = path.join(__dirname, '../../angelone_instruments.json');

/**
 * Fetch all instruments from AngelOne and save to local JSON cache file.
 */
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
  // Convert to IST (UTC+5:30)
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const totalMin = hours * 60 + minutes;
  return totalMin >= 555 && totalMin <= 930; // 9:15 to 15:30
};

/**
 * Simulate trades for all visible DummyLeaderboard entries.
 * Each entry randomly takes 1–3 trades (win/loss) and updates stats.
 * Only runs during market hours on weekdays.
 */
const runDummyUserTrades = async () => {
  if (!isMarketHours()) return;

  try {
    const dummies = await DummyLeaderboard.find({ isVisible: true });
    if (!dummies.length) return;

    // Pick 30–70% of dummy users to trade this cycle
    const participants = dummies.filter(() => Math.random() < 0.5);
    if (!participants.length) return;

    const bulkOps = participants.map((dummy) => {
      const tradeCount = randInt(1, 3);
      let pnlDelta = 0;
      let winCount = 0;
      let lossCount = 0;
      let winAmtDelta = 0;
      let lossAmtDelta = 0;

      for (let i = 0; i < tradeCount; i++) {
        const isWin = Math.random() < 0.55; // 55% win rate on average
        const amount = parseFloat(randBetween(500, 45000).toFixed(2));
        if (isWin) {
          pnlDelta += amount;
          winAmtDelta += amount;
          winCount++;
        } else {
          pnlDelta -= amount;
          lossAmtDelta += amount;
          lossCount++;
        }
      }

      const newTotalTrades = dummy.totalTrades + tradeCount;
      const newWinAmount = dummy.winAmount + winAmtDelta;
      const newLossAmount = dummy.lossAmount + lossAmtDelta;
      const totalWins = Math.round((dummy.winRate / 100) * dummy.totalTrades) + winCount;
      const newWinRate = parseFloat(((totalWins / newTotalTrades) * 100).toFixed(2));

      return {
        updateOne: {
          filter: { _id: dummy._id },
          update: {
            $inc: { totalPnl: parseFloat(pnlDelta.toFixed(2)), totalTrades: tradeCount },
            $set: {
              winRate: newWinRate,
              winAmount: parseFloat(newWinAmount.toFixed(2)),
              lossAmount: parseFloat(newLossAmount.toFixed(2)),
            },
          },
        },
      };
    });

    await DummyLeaderboard.bulkWrite(bulkOps);
    logger.info(`Dummy trade simulation: updated ${participants.length} dummy users`);
  } catch (error) {
    logger.error('runDummyUserTrades error:', error.message);
  }
};

/**
 * Add new dummy leaderboard entries if count is below threshold.
 * Runs daily — creates 1–3 new realistic dummy users with seeded stats.
 */
const addDummyLeaderboardEntries = async () => {
  try {
    const count = await DummyLeaderboard.countDocuments({ isVisible: true });

    // Keep at least 15 visible dummy entries
    if (count >= 15) {
      logger.info(`Dummy entries already at ${count}, skipping creation`);
      return;
    }

    const toAdd = randInt(1, 3);
    const usedNames = (await DummyLeaderboard.distinct('name')) || [];
    const availableNames = DUMMY_NAMES.filter((n) => !usedNames.includes(n));

    if (!availableNames.length) {
      logger.info('No new dummy names available to add');
      return;
    }

    const entries = [];
    for (let i = 0; i < Math.min(toAdd, availableNames.length); i++) {
      const totalTrades = randInt(20, 120);
      const winRate = parseFloat(randBetween(45, 75).toFixed(2));
      const totalWins = Math.round((winRate / 100) * totalTrades);
      const winAmount = parseFloat(randBetween(50000, 800000).toFixed(2));
      const lossAmount = parseFloat(randBetween(20000, winAmount * 0.7).toFixed(2));

      entries.push({
        name: availableNames[i],
        totalPnl: parseFloat((winAmount - lossAmount).toFixed(2)),
        totalTrades,
        winRate,
        winAmount,
        lossAmount,
        isVisible: true,
      });
    }

    await DummyLeaderboard.insertMany(entries);
    logger.info(`Added ${entries.length} new dummy leaderboard entries`);
  } catch (error) {
    logger.error('addDummyLeaderboardEntries error:', error.message);
  }
};

// =================== LEADERBOARD ===================

/**
 * Snapshot current leaderboard and save to history.
 */
const snapshotLeaderboard = async () => {
  try {
    // Fetch real premium users with activity
    const realUsers = await User.find({
      role: 'user',
      isActive: true,
      isPremium: true,
    }).select('name totalPnl totalTrades');

    // Fetch visible dummy entries
    const dummyEntries = await DummyLeaderboard.find({ isVisible: true }).select(
      'name totalPnl totalTrades'
    );

    // Merge and sort by totalPnl descending
    const combined = [
      ...realUsers.map((u) => ({
        userId: u._id,
        name: u.name,
        totalPnl: u.totalPnl,
        totalTrades: u.totalTrades,
        isDummy: false,
      })),
      ...dummyEntries.map((d) => ({
        userId: null,
        name: d.name,
        totalPnl: d.totalPnl,
        totalTrades: d.totalTrades,
        isDummy: true,
      })),
    ].sort((a, b) => b.totalPnl - a.totalPnl);

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
 * Close all open positions for premium users (balance reset wipes the slate).
 */
const closeOpenPositions = async () => {
  try {
    const result = await Position.updateMany(
      { status: 'OPEN' },
      {
        $set: {
          status: 'CLOSED',
          closedAt: new Date(),
          unrealizedPnl: 0,
        },
      }
    );
    logger.info(`Closed ${result.modifiedCount} open positions for daily reset`);
  } catch (error) {
    logger.error('closeOpenPositions error:', error.message);
  }
};

/**
 * Reset balance and stats for all premium users.
 */
const resetPremiumUsers = async () => {
  try {
    const result = await User.updateMany(
      { role: 'user', isActive: true, isPremium: true },
      {
        $set: {
          dummyBalance: DUMMY_BALANCE, // reset to 5 crore
          totalPnl: 0,
          totalTrades: 0,
        },
      }
    );
    logger.info(`Daily reset: ${result.modifiedCount} premium users reset to 5cr`);
  } catch (error) {
    logger.error('resetPremiumUsers error:', error.message);
  }
};

/**
 * Full daily cycle: snapshot → close positions → reset balances.
 * Runs at midnight (00:00) every day.
 */
const startDailyScheduler = () => {
  // Refresh AngelOne instruments cache every 24 hours at 6 AM
  cron.schedule('0 6 * * *', async () => {
    await refreshInstrumentsCache();
  });

  // Run once on startup so the cache is available immediately
  refreshInstrumentsCache();

  // Simulate dummy user trades every 15 minutes (only during market hours)
  cron.schedule('*/15 * * * *', async () => {
    await runDummyUserTrades();
  });

  // Add new dummy leaderboard entries daily at 8 AM (before market opens)
  cron.schedule('0 8 * * 1-5', async () => {
    await addDummyLeaderboardEntries();
  });

  cron.schedule('0 0 * * *', async () => {
    logger.info('=== Daily leaderboard & balance reset started ===');
    await snapshotLeaderboard();
    await closeOpenPositions();
    await resetPremiumUsers();
    logger.info('=== Daily leaderboard & balance reset completed ===');
  });

  // Auto-refresh AngelOne session every 22 hours using refresh token
  cron.schedule('0 */22 * * *', async () => {
    const angeloneConfig = require('../config/angelone');
    const wsService = require('./websocket.service');
    if (!angeloneConfig.isSessionValid()) {
      logger.info('AngelOne session expired, attempting auto-refresh...');
      try {
        const refreshed = await angeloneConfig.refreshSession();
        // Reconnect WebSocket with new tokens
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

  logger.info('Daily scheduler initialized — runs at midnight every day');
};

module.exports = { startDailyScheduler, runDummyUserTrades, addDummyLeaderboardEntries };
