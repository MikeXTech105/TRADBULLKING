const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TradBullKing API',
      version: '2.0.0',
      description: `
## TradBullKing — Paper Trading Platform API

Comprehensive paper trading platform with AngelOne SmartAPI integration, real-time WebSocket prices, and candlestick charts.

---

### User Flow
| Step | Event | Balance |
|------|-------|---------|
| 1 | **Register** | ₹1,00,00,000 (1 crore) — trial |
| 2 | **Pay ₹500** | ₹5,00,00,000 (5 crore) — premium |
| 3 | **Daily reset (midnight)** | Reset to 5cr (premium users only) |
| 4 | **Each trade** | ₹2 deducted from feeBalance |
| 5 | **Refer a friend** | +₹125 to withdrawableBalance (on their first payment) |
| 6 | **Win daily competition** | ₹250–₹2000 added to withdrawableBalance |

- Trial period: 48 hours from registration
- Payment breakdown: ₹99 platform fee + ₹401 to feeBalance
- Leaderboard snapshots saved every 24 hours before reset

### Referral System
- Every user gets a unique referral code (format: \`TBKXXXXXX\`)
- Share your referral code or link with others
- When a referred user makes their **first ₹500 payment**, you receive **₹125** in your withdrawableBalance

### Daily Competition (3:45 PM IST, Mon–Fri)
Top 5 users by daily P&L win prizes added to withdrawableBalance:
| Rank | Prize |
|------|-------|
| 1st | ₹2,000 |
| 2nd | ₹1,500 |
| 3rd | ₹1,000 |
| 4th | ₹500 |
| 5th | ₹250 |

### Withdrawal
- Only \`withdrawableBalance\` (competition + referral) can be withdrawn
- Minimum withdrawal: ₹1,000
- Trading balance (dummyBalance) is **not** withdrawable
- Requests auto-approved instantly — no admin action needed

### Custom Competitions
- Admin creates paid competitions with a set user cap and entry fee
- Users join by paying the entry fee from their \`withdrawableBalance\`
- When all slots are filled, competition is marked FULL and hidden from users
- At 3:45 PM IST, prize pool (minus admin %) goes to the user with highest daily P&L
- View leaderboard via \`GET /leaderboard?filterType=competition&competitionId=<id>\`

---

### Authentication
All protected routes require: \`Authorization: Bearer <accessToken>\`

---

### 🔌 Socket.IO — Real-Time Events

**Server:** \`http://localhost:5000\`
**Path:** \`/socket.io\`

#### Client → Server (emit)

| Event | Payload | Description |
|-------|---------|-------------|
| \`subscribe:stocks\` | \`["2885", "11536"]\` | Subscribe to price updates for token array |
| \`unsubscribe:stocks\` | \`["2885"]\` | Unsubscribe from tokens |
| \`subscribe:all\` | _(none)_ | Subscribe to all active stocks at once |

#### Server → Client (listen)

| Event | Payload | Description |
|-------|---------|-------------|
| \`price:update\` | \`{ token, ltp, change, changePercent, high, low, open, close, volume }\` | Fired on every price tick from AngelOne |
| \`candle:update\` | \`{ token, time, open, high, low, close, volume }\` | Current 1-min candle state (updates on every tick within the minute) |
| \`subscribed:all\` | \`{ count }\` | Confirmation after \`subscribe:all\` |

#### Socket.IO Quick Start (JavaScript)
\`\`\`javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Subscribe to RELIANCE (token 2885) and TCS (token 11536)
socket.emit('subscribe:stocks', ['2885', '11536']);

// Real-time LTP updates
socket.on('price:update', (data) => {
  console.log(data.token, data.ltp, data.changePercent + '%');
});

// Live candle updates for chart
socket.on('candle:update', (candle) => {
  // { token, time (unix seconds), open, high, low, close, volume }
  chart.series.update(candle);
});
\`\`\`

#### AngelOne WebSocket (Internal — Admin Only)
The backend maintains a persistent WebSocket to AngelOne SmartAPI:
- URL: \`wss://smartapisocket.angelone.in/smart-stream\`
- Mode: LTP (mode 1) — tick-level last traded price
- Heartbeat: every 20 seconds
- Batch DB writes: every 2 seconds
- Auto-reconnect: exponential backoff (5 attempts)
- Session auto-refresh: every 22 hours via cron
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
            userName: { type: 'string', example: 'john_doe', description: 'Unique username (alphanumeric + underscore)' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
            isPremium: { type: 'boolean' },
            isActive: { type: 'boolean' },
            trialEndDate: { type: 'string', format: 'date-time' },
            isTrialActive: { type: 'boolean' },
            dummyBalance: { type: 'number', example: 50000000 },
            feeBalance: { type: 'number', example: 401 },
            withdrawableBalance: { type: 'number', example: 2125, description: 'Competition prizes + referral bonuses — withdrawable' },
            totalPnl: { type: 'number' },
            dailyPnl: { type: 'number', description: 'P&L for today only — resets at midnight, used for competition' },
            totalTrades: { type: 'integer' },
            referralCode: { type: 'string', example: 'TBKX3A9Z', description: 'Share this code to earn referral bonuses' },
            referredBy: { type: 'string', nullable: true, description: 'User ID of referrer' },
          },
        },
        WithdrawalRequest: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            amount: { type: 'number', example: 1500 },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
            bankDetails: {
              type: 'object',
              properties: {
                accountNumber: { type: 'string' },
                ifsc: { type: 'string' },
                accountName: { type: 'string' },
                bankName: { type: 'string' },
              },
            },
            rejectionReason: { type: 'string', nullable: true },
            processedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CompetitionResult: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rank: { type: 'integer', example: 1 },
                  userId: { type: 'string' },
                  name: { type: 'string' },
                  dailyPnl: { type: 'number' },
                  prize: { type: 'number', example: 2000 },
                },
              },
            },
            totalParticipants: { type: 'integer' },
            announcedAt: { type: 'string', format: 'date-time' },
          },
        },
        CustomCompetition: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Elite Traders Cup' },
            description: { type: 'string', example: '10-user winner-takes-all competition' },
            maxUsers: { type: 'integer', example: 10 },
            entryFee: { type: 'number', example: 100 },
            adminPercentage: { type: 'number', example: 3, description: '% of total pool deducted as admin fee' },
            status: { type: 'string', enum: ['OPEN', 'FULL', 'COMPLETED'], example: 'OPEN' },
            participantCount: { type: 'integer', example: 4 },
            prizePool: { type: 'number', example: 970, description: 'participantCount × entryFee × (1 - adminPercentage/100)' },
            adminCut: { type: 'number', example: 30 },
            winner: {
              type: 'object',
              nullable: true,
              properties: {
                userId: { type: 'string' },
                name: { type: 'string' },
                dailyPnl: { type: 'number' },
                prize: { type: 'number' },
              },
            },
            date: { type: 'string', format: 'date-time', description: 'Competition date (IST midnight)' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
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
        Candle: {
          type: 'object',
          description: 'A single OHLCV candlestick data point (lightweight-charts compatible)',
          properties: {
            time: { type: 'integer', description: 'Unix timestamp in seconds (candle open time)', example: 1705298100 },
            open: { type: 'number', example: 2450.0 },
            high: { type: 'number', example: 2478.5 },
            low: { type: 'number', example: 2441.2 },
            close: { type: 'number', example: 2465.8 },
            volume: { type: 'integer', example: 123456 },
          },
        },
        CandleResponse: {
          type: 'object',
          properties: {
            symbol: { type: 'string', example: 'RELIANCE' },
            exchange: { type: 'string', example: 'NSE' },
            interval: { type: 'string', example: 'ONE_MINUTE' },
            source: { type: 'string', enum: ['angelone', 'stored'], description: 'angelone = live API, stored = MongoDB fallback' },
            candles: { type: 'array', items: { $ref: '#/components/schemas/Candle' } },
          },
        },
        PriceUpdateEvent: {
          type: 'object',
          description: 'Socket.IO price:update event payload',
          properties: {
            token: { type: 'string', example: '2885' },
            ltp: { type: 'number', example: 2465.8 },
            change: { type: 'number', example: 12.5 },
            changePercent: { type: 'number', example: 0.51 },
            high: { type: 'number', example: 2480.0 },
            low: { type: 'number', example: 2440.0 },
            open: { type: 'number', example: 2450.0 },
            close: { type: 'number', example: 2453.3 },
            volume: { type: 'integer', example: 1234567 },
          },
        },
        CandleUpdateEvent: {
          type: 'object',
          description: 'Socket.IO candle:update event payload — current in-progress 1-min candle',
          properties: {
            token: { type: 'string', example: '2885' },
            time: { type: 'integer', description: 'Candle open time (Unix seconds)', example: 1705298100 },
            open: { type: 'number', example: 2450.0 },
            high: { type: 'number', example: 2465.8 },
            low: { type: 'number', example: 2448.5 },
            close: { type: 'number', example: 2465.8 },
            volume: { type: 'integer', example: 5432 },
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
    tags: [
      { name: 'Auth', description: 'Registration, login, profile management' },
      { name: 'Stocks', description: 'Stock market data, OHLC candles, live LTP' },
      { name: 'Orders', description: 'Buy/Sell orders and portfolio management' },
      { name: 'Payments', description: '₹500 subscription via Cashfree' },
      { name: 'Leaderboard', description: 'Trading leaderboard and user profiles' },
      { name: 'Watchlist', description: 'User watchlist management' },
      { name: 'Admin', description: 'Admin-only endpoints (require admin role)' },
      { name: 'Withdrawals', description: 'Withdrawal requests — only withdrawableBalance (competition prizes + referral bonuses) can be withdrawn. Min ₹1,000. Auto-approved.' },
      { name: 'Competition', description: 'Daily trading competition — top 5 by daily P&L win ₹250–₹2,000. Results at 3:45 PM IST on weekdays.' },
      { name: 'Competitions', description: 'Paid custom competitions created by admin. Users join by paying the entry fee from withdrawableBalance. Winner-takes-all at 3:45 PM IST.' },
      {
        name: 'WebSocket',
        description: `
**Socket.IO server runs at the same port as the HTTP server.**

### Connect
\`\`\`
const socket = io('http://localhost:5000');
\`\`\`

### Events You Can Emit (Client → Server)

| Event | Data | Description |
|-------|------|-------------|
| \`subscribe:stocks\` | \`string[]\` (token array) | Start receiving price updates for these tokens |
| \`unsubscribe:stocks\` | \`string[]\` (token array) | Stop receiving updates |
| \`subscribe:all\` | — | Subscribe to all active stocks |

### Events You Can Listen To (Server → Client)

| Event | Schema | Frequency |
|-------|--------|-----------|
| \`price:update\` | PriceUpdateEvent | Every AngelOne tick (~1-3s) |
| \`candle:update\` | CandleUpdateEvent | Every tick (aggregated to current 1-min candle) |
| \`subscribed:all\` | \`{ count: number }\` | Once after subscribe:all |

### Token Reference
Use the \`token\` field from any stock object (e.g., RELIANCE = \`2885\`, TCS = \`11536\`).
Get tokens via \`GET /api/stocks\`.
        `,
      },
    ],
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
