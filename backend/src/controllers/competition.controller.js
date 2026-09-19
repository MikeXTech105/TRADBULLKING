const mongoose = require('mongoose');
const User = require('../models/User');
const CustomCompetition = require('../models/CustomCompetition');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger');

// GET /api/competitions — list OPEN competitions (not full, today's date)
const listOpenCompetitions = async (req, res) => {
  try {
    const competitions = await CustomCompetition.find({ status: 'OPEN' })
      .select('-participants')
      .sort({ createdAt: -1 });
    return successResponse(res, 'Open competitions fetched', { competitions });
  } catch (error) {
    logger.error('listOpenCompetitions error:', error.message);
    return errorResponse(res, 'Failed to fetch competitions', 500);
  }
};

// GET /api/competitions/my — competitions current user has joined
const myCompetitions = async (req, res) => {
  try {
    const competitions = await CustomCompetition.find({
      'participants.userId': req.user._id,
    }).select('-participants').sort({ createdAt: -1 });
    return successResponse(res, 'Your competitions fetched', { competitions });
  } catch (error) {
    logger.error('myCompetitions error:', error.message);
    return errorResponse(res, 'Failed to fetch competitions', 500);
  }
};

// POST /api/competitions/:id/join — join a competition
const joinCompetition = async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    const competition = await CustomCompetition.findById(req.params.id).session(dbSession);
    if (!competition) {
      await dbSession.abortTransaction();
      return errorResponse(res, 'Competition not found', 404);
    }
    if (competition.status !== 'OPEN') {
      await dbSession.abortTransaction();
      return errorResponse(res, 'This competition is no longer open', 400);
    }

    // Check user not already joined
    const alreadyJoined = competition.participants.some(
      (p) => p.userId.toString() === req.user._id.toString()
    );
    if (alreadyJoined) {
      await dbSession.abortTransaction();
      return errorResponse(res, 'You have already joined this competition', 400);
    }

    // Check user has enough withdrawableBalance
    const user = await User.findById(req.user._id).session(dbSession);
    if (!user) {
      await dbSession.abortTransaction();
      return errorResponse(res, 'User not found', 404);
    }
    if (!user.isPremium) {
      await dbSession.abortTransaction();
      return errorResponse(res, 'Only premium users can join competitions', 403);
    }
    if (user.withdrawableBalance < competition.entryFee) {
      await dbSession.abortTransaction();
      return errorResponse(res, `Insufficient withdrawable balance. Required: ₹${competition.entryFee}, Available: ₹${user.withdrawableBalance}`, 400);
    }

    // Deduct entry fee and add participant atomically
    user.withdrawableBalance -= competition.entryFee;
    await user.save({ session: dbSession });

    competition.participants.push({ userId: req.user._id, joinedAt: new Date() });
    competition.participantCount += 1;

    // Update prize pool and admin cut based on current participant count
    competition.prizePool = parseFloat((competition.participantCount * competition.entryFee * (1 - competition.adminPercentage / 100)).toFixed(2));
    competition.adminCut = parseFloat((competition.participantCount * competition.entryFee * (competition.adminPercentage / 100)).toFixed(2));

    // Mark as FULL if reached maxUsers
    if (competition.participantCount >= competition.maxUsers) {
      competition.status = 'FULL';
    }

    await competition.save({ session: dbSession });
    await dbSession.commitTransaction();

    logger.info(`User ${req.user._id} joined competition ${competition._id}`);
    return successResponse(res, 'Successfully joined the competition', {
      competitionId: competition._id,
      title: competition.title,
      entryFee: competition.entryFee,
      prizePool: competition.prizePool,
      participantCount: competition.participantCount,
      maxUsers: competition.maxUsers,
      status: competition.status,
      withdrawableBalance: user.withdrawableBalance,
    });
  } catch (error) {
    await dbSession.abortTransaction();
    logger.error('joinCompetition error:', error.message);
    return errorResponse(res, 'Failed to join competition', 500);
  } finally {
    dbSession.endSession();
  }
};

module.exports = { listOpenCompetitions, myCompetitions, joinCompetition };
