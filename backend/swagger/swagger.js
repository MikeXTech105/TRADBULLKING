const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trading App API',
      version: '1.0.0',
      description: `
## Paper Trading Application API

A comprehensive paper trading platform with AngelOne SmartAPI integration.

### User Flow
1. **Register** → Get 48 hours free trial (trade freely)
2. **After 48 hours** → Must pay ₹500 to continue trading
3. **Payment** → ₹99 platform fee + ₹401 credited to feeBalance
4. **After payment** → Get ₹5,00,00,000 (5 crore) dummyBalance for trading
5. **Each trade** → ₹2 deducted from feeBalance
6. **feeBalance = 0** → Must recharge (pay ₹500 again)

### Authentication
Use Bearer token in Authorization header: \`Authorization: Bearer <token>\`
      `,
      contact: {
        name: 'Trading App Support',
        email: 'support@trading.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
            isPremium: { type: 'boolean' },
            isActive: { type: 'boolean' },
            trialEndDate: { type: 'string', format: 'date-time' },
            isTrialActive: { type: 'boolean' },
            dummyBalance: { type: 'number', example: 50000000 },
            feeBalance: { type: 'number', example: 401 },
            totalPnl: { type: 'number' },
            totalTrades: { type: 'integer' },
          },
        },
        Stock: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string', example: 'RELIANCE' },
            token: { type: 'string', example: '2885' },
            exchange: { type: 'string', enum: ['NSE', 'BSE', 'NFO', 'MCX'] },
            name: { type: 'string', example: 'Reliance Industries Ltd' },
            ltp: { type: 'number', example: 2456.75 },
            change: { type: 'number', example: 12.5 },
            changePercent: { type: 'number', example: 0.51 },
            high: { type: 'number' },
            low: { type: 'number' },
            open: { type: 'number' },
            close: { type: 'number' },
            volume: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            stockId: { type: 'string' },
            symbol: { type: 'string' },
            exchange: { type: 'string' },
            orderType: { type: 'string', enum: ['BUY', 'SELL'] },
            quantity: { type: 'integer' },
            price: { type: 'number' },
            priceType: { type: 'string', enum: ['MARKET', 'LIMIT'] },
            status: { type: 'string', enum: ['PENDING', 'EXECUTED', 'CANCELLED', 'FAILED'] },
            totalValue: { type: 'number' },
            pnl: { type: 'number', nullable: true },
            feesDeducted: { type: 'number', example: 2 },
            executedAt: { type: 'string', format: 'date-time' },
          },
        },
        Position: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            symbol: { type: 'string' },
            exchange: { type: 'string' },
            quantity: { type: 'integer' },
            avgBuyPrice: { type: 'number' },
            currentPrice: { type: 'number' },
            investedAmount: { type: 'number' },
            currentValue: { type: 'number' },
            unrealizedPnl: { type: 'number' },
            realizedPnl: { type: 'number' },
            status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            amount: { type: 'number', example: 500 },
            platformFee: { type: 'number', example: 99 },
            creditAmount: { type: 'number', example: 401 },
            status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
            cashfreeOrderId: { type: 'string' },
            paymentLink: { type: 'string' },
          },
        },
        LeaderboardEntry: {
          type: 'object',
          properties: {
            rank: { type: 'integer' },
            name: { type: 'string' },
            profilePic: { type: 'string', nullable: true },
            totalPnl: { type: 'number' },
            totalTrades: { type: 'integer' },
            winRate: { type: 'number' },
            type: { type: 'string', enum: ['real', 'dummy'] },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: { type: 'object' },
              nullable: true,
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object', nullable: true },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        ForbiddenError: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
