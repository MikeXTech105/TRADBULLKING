const User = require('../models/User');
const logger = require('./logger');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@trading.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existingAdmin = await User.findOne({ role: 'admin' });

    if (!existingAdmin) {
      const admin = new User({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isActive: true,
        isPremium: true,
        dummyBalance: 0,
        feeBalance: 0,
      });

      await admin.save();
      logger.info(`Admin user created: ${adminEmail}`);
    } else {
      logger.info('Admin user already exists, skipping seed.');
    }
  } catch (error) {
    logger.error('Error seeding admin user:', error);
  }
};

module.exports = { seedAdmin };
