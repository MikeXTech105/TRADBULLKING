require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');
const wsService = require('./src/services/websocket.service');
const { startDailyScheduler } = require('./src/services/scheduler.service');
const { seedAdmin } = require('./src/utils/seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed admin user if not exists
    await seedAdmin();

    // Start daily leaderboard snapshot & balance reset scheduler
    startDailyScheduler();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Set Socket.IO instance in WebSocket service
    wsService.setSocketIO(io);

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      logger.info(`Socket.IO client connected: ${socket.id}`);

      // Subscribe to stock price updates for specific tokens
      socket.on('subscribe:stocks', (tokens) => {
        if (Array.isArray(tokens)) {
          tokens.forEach((token) => socket.join(`stock:${token}`));
          logger.debug(`Client ${socket.id} subscribed to ${tokens.length} stock rooms`);
        }
      });

      // Unsubscribe from stock price updates
      socket.on('unsubscribe:stocks', (tokens) => {
        if (Array.isArray(tokens)) {
          tokens.forEach((token) => socket.leave(`stock:${token}`));
        }
      });

      // Subscribe to all stocks at once
      socket.on('subscribe:all', async () => {
        const subscribedTokens = wsService.getSubscribedTokens();
        subscribedTokens.forEach((token) => socket.join(`stock:${token}`));
        socket.emit('subscribed:all', { count: subscribedTokens.length });
      });

      socket.on('disconnect', (reason) => {
        logger.info(`Socket.IO client disconnected: ${socket.id}, reason: ${reason}`);
      });

      socket.on('error', (error) => {
        logger.error(`Socket.IO error for ${socket.id}:`, error.message);
      });
    });

    // Try to initialize AngelOne WebSocket if credentials are configured
    const angelClientId = process.env.ANGELONE_CLIENT_ID;
    const angelPassword = process.env.ANGELONE_PASSWORD;

    if (angelClientId && angelPassword && angelClientId !== 'your_angelone_client_id') {
      logger.info(
        'AngelOne credentials found. Use POST /api/admin/angelone/session to initialize session with TOTP.'
      );
    } else {
      logger.info('AngelOne credentials not configured. Live prices will be unavailable.');
      logger.info('Configure ANGELONE_CLIENT_ID and ANGELONE_PASSWORD in .env file.');
    }

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`======================================`);
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Base URL: http://localhost:${PORT}/api`);
      logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`Health Check: http://localhost:${PORT}/health`);
      logger.info(`======================================`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      wsService.disconnect();

      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down.');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
