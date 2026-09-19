export const TERMS_VERSION = "1.0-draft";
export const TERMS_LAST_UPDATED = "September 19, 2026";
export const PRIVACY_VERSION = "1.0-draft";
export const PRIVACY_LAST_UPDATED = "September 19, 2026";

// Keep commercial values centralized. The backend remains the source of truth
// for eligibility, balances, deductions, and payment verification.
export const PLATFORM_OFFERING = {
  trialHours: 48,
  membershipTotal: 500,
  platformFee: 99,
  feeBalanceCredit: 401,
  activatedVirtualBalance: 50000000,
  tradeFee: 2,
};

// Leaderboard winner prizes in INR, by rank (1st to 5th).
export const LEADERBOARD_PRIZES = [2000, 1500, 1000, 500, 250];
export const prizeForRank = (rank) => LEADERBOARD_PRIZES[Number(rank) - 1];
