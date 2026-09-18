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

module.exports = { startDailyScheduler };
