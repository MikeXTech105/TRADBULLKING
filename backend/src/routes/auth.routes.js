const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  updateProfileValidation,
} = require('../middlewares/validate.middleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - userName
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               userName:
 *                 type: string
 *                 example: "johndoe123"
 *                 description: "Unique username — 3–30 chars, alphanumeric and underscore only (a-z, 0-9, _). Stored lowercase."
 *               referralCode:
 *                 type: string
 *                 example: "TBKX3A9Z"
 *                 description: "Optional. A friend's referral code (format: TBKXXXXXX). If valid, the referrer gets ₹125 in their withdrawableBalance when you make your first ₹500 payment."
 *     responses:
 *       201:
 *         description: "Registration successful. User gets ₹1 crore trial balance and 48-hour free trial. Response includes the user's own referralCode to share with others."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         userName:
 *                           type: string
 *                           example: "johndoe123"
 *                         referralCode:
 *                           type: string
 *                           example: "TBKX3A9Z"
 *                           description: "Share this code (or link) to earn ₹125 per referral on their first payment"
 *                         dummyBalance:
 *                           type: number
 *                           example: 10000000
 *                           description: "₹1 crore starting balance"
 *                         trialEndDate:
 *                           type: string
 *                           format: date-time
 *                         isPremium:
 *                           type: boolean
 *                           example: false
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: string
 *                           example: "7d"
 *       409:
 *         description: "Email or username already taken"
 *       422:
 *         description: Validation error (userName format invalid, password too short, etc.)
 */
router.post('/register', registerValidation, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         userName:
 *                           type: string
 *                         referralCode:
 *                           type: string
 *                           description: "User's own referral code to share with others"
 *                         withdrawableBalance:
 *                           type: number
 *                           description: "Competition prizes + referral bonuses (withdrawable)"
 *                         dailyPnl:
 *                           type: number
 *                           description: "Today's P&L — resets at midnight, used for competition ranking"
 *                         isPremium:
 *                           type: boolean
 *                         canTrade:
 *                           type: boolean
 *                         dummyBalance:
 *                           type: number
 *                         feeBalance:
 *                           type: number
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 */
router.post('/login', loginValidation, authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authController.refreshToken);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full profile including referral code, balances, and trading stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     userName:
 *                       type: string
 *                       example: "johndoe123"
 *                     referralCode:
 *                       type: string
 *                       example: "TBKX3A9Z"
 *                       description: "Share this code so friends can enter it at signup. You earn ₹125 on their first payment."
 *                     referredBy:
 *                       type: string
 *                       nullable: true
 *                       description: "User ID of the person who referred this user (null if not referred)"
 *                     withdrawableBalance:
 *                       type: number
 *                       example: 2125
 *                       description: "Competition prizes + referral bonuses. Min ₹1,000 to withdraw."
 *                     dailyPnl:
 *                       type: number
 *                       description: "Today's realized P&L — resets at midnight"
 *                     dummyBalance:
 *                       type: number
 *                     feeBalance:
 *                       type: number
 *                     isPremium:
 *                       type: boolean
 *                     isTrialActive:
 *                       type: boolean
 *                     canTrade:
 *                       type: boolean
 *                     trialEndDate:
 *                       type: string
 *                       format: date-time
 *                     totalPnl:
 *                       type: number
 *                     totalTrades:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile (name and phone only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', authenticate, updateProfileValidation, authController.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Incorrect current password
 */
router.post(
  '/change-password',
  authenticate,
  changePasswordValidation,
  authController.changePassword
);

module.exports = router;
