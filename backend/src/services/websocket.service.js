const WebSocket = require('ws');
const Stock = require('../models/Stock');
const logger = require('../utils/logger');

class AngelOneWebSocketService {
  constructor() {
    this.ws = null;
    this.jwtToken = null;
    this.feedToken = null;
    this.clientCode = null;
    this.subscribedTokens = new Map(); // token -> exchangeType
    this.io = null; // Socket.IO instance
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.heartbeatInterval = null;
    this.isConnected = false;
    this.pendingBatchUpdates = new Map(); // token -> stockData, for batch DB updates
    this.batchUpdateInterval = null;
    this.currentCandles = new Map(); // token -> { timestamp (ms), open, high, low, close, volume, symbol, exchange }
    this.completedCandles = []; // completed 1-min candles waiting to be saved
  }

  /**
   * Set Socket.IO instance
   * @param {Object} io - Socket.IO server instance
   */
  setSocketIO(io) {
    this.io = io;
    logger.info('Socket.IO instance set in WebSocket service.');
  }

  /**
   * Connect to AngelOne SmartAPI WebSocket
   * @param {string} jwtToken
   * @param {string} feedToken
   * @param {string} clientCode
   */
  async connect(jwtToken, feedToken, clientCode) {
    this.jwtToken = jwtToken;
    this.feedToken = feedToken;
    this.clientCode = clientCode;

    if (this.ws) {
      this.disconnect();
    }

    const wsUrl = 'wss://smartapisocket.angelone.in/smart-stream';

    try {
      this.ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: jwtToken,
          'x-client-code': clientCode,
          'x-feed-token': feedToken,
          'x-client-type': 'WEB',
        },
      });

      this.ws.on('open', () => {
        logger.info('AngelOne WebSocket connected.');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Start heartbeat
        this.startHeartbeat();

        // Start batch update interval
        this.startBatchUpdateInterval();

        // Resubscribe to all previously subscribed tokens
        if (this.subscribedTokens.size > 0) {
          const tokenList = Array.from(this.subscribedTokens.entries()).map(
            ([token, exchangeType]) => ({ exchange: this.getExchangeName(exchangeType), token })
          );
          this.subscribe(tokenList);
        }
      });

      this.ws.on('message', (data) => {
        try {
          this.handleMessage(data);
        } catch (err) {
          logger.error('Error handling WS message:', err.message);
        }
      });

      this.ws.on('close', (code, reason) => {
        logger.warn(`AngelOne WebSocket closed. Code: ${code}, Reason: ${reason}`);
        this.isConnected = false;
        this.stopHeartbeat();
        this.stopBatchUpdateInterval();
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        logger.error('AngelOne WebSocket error:', error.message);
        this.isConnected = false;
      });
    } catch (error) {
      logger.error('Failed to connect to AngelOne WebSocket:', error.message);
      this.attemptReconnect();
    }
  }

  /**
   * Get exchange name from exchange type number
   */
  getExchangeName(exchangeType) {
    const map = { 1: 'NSE', 2: 'NFO', 3: 'BSE', 4: 'BSE_FO', 5: 'MCX' };
    return map[exchangeType] || 'NSE';
  }

  /**
   * Get exchange type number from exchange name
   */
  getExchangeType(exchange) {
    const map = { NSE: 1, NFO: 2, BSE: 3, BSE_FO: 4, MCX: 5 };
    return map[exchange] || 1;
  }

  /**
   * Subscribe to stock price updates
   * @param {Array} tokenList - [{ exchange: 'NSE', token: '2885' }]
   */
  subscribe(tokenList) {
    if (!this.isConnected || !this.ws) {
      logger.warn('WebSocket not connected. Storing tokens for later subscription.');
      tokenList.forEach(({ exchange, token }) => {
        const exchangeType = this.getExchangeType(exchange);
        this.subscribedTokens.set(token, exchangeType);
      });
      return;
    }

    // Group by exchange type
    const grouped = {};
    tokenList.forEach(({ exchange, token }) => {
      const exchangeType = this.getExchangeType(exchange);
      if (!grouped[exchangeType]) {
        grouped[exchangeType] = [];
      }
      grouped[exchangeType].push(token);
      this.subscribedTokens.set(token, exchangeType);
    });

    // Build subscription message
    const tokenExchangeList = Object.entries(grouped).map(([exchangeType, tokens]) => ({
      exchangeType: parseInt(exchangeType),
      tokens,
    }));

    const subscriptionMessage = {
      correlationID: `sub_${Date.now()}`,
      action: 1, // SUBSCRIBE
      params: {
        mode: 1, // LTP mode
        tokenList: tokenExchangeList,
      },
    };

    try {
      this.ws.send(JSON.stringify(subscriptionMessage));
      logger.info(`Subscribed to ${tokenList.length} tokens.`);
    } catch (error) {
      logger.error('Error sending subscription message:', error.message);
    }
  }

  /**
   * Unsubscribe from stock price updates
   * @param {Array} tokenList - [{ exchange: 'NSE', token: '2885' }]
   */
  unsubscribe(tokenList) {
    if (!this.isConnected || !this.ws) {
      tokenList.forEach(({ token }) => this.subscribedTokens.delete(token));
      return;
    }

    // Group by exchange type
    const grouped = {};
    tokenList.forEach(({ exchange, token }) => {
      const exchangeType = this.getExchangeType(exchange);
      if (!grouped[exchangeType]) {
        grouped[exchangeType] = [];
      }
      grouped[exchangeType].push(token);
      this.subscribedTokens.delete(token);
    });

    const tokenExchangeList = Object.entries(grouped).map(([exchangeType, tokens]) => ({
      exchangeType: parseInt(exchangeType),
      tokens,
    }));

    const unsubscribeMessage = {
      correlationID: `unsub_${Date.now()}`,
      action: 0, // UNSUBSCRIBE
      params: {
        mode: 1,
        tokenList: tokenExchangeList,
      },
    };

    try {
      this.ws.send(JSON.stringify(unsubscribeMessage));
      logger.info(`Unsubscribed from ${tokenList.length} tokens.`);
    } catch (error) {
      logger.error('Error sending unsubscription message:', error.message);
    }
  }

  /**
   * Handle incoming WebSocket messages (binary or JSON)
   * @param {Buffer|string} data
   */
  handleMessage(data) {
    let parsedData;

    // Try to parse as JSON first, otherwise treat as binary
    try {
      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
      } else if (Buffer.isBuffer(data)) {
        // AngelOne sends binary messages - parse based on their protocol
        parsedData = this.parseBinaryMessage(data);
      } else {
        parsedData = JSON.parse(data.toString());
      }
    } catch (err) {
      // Heartbeat or unknown message format
      return;
    }

    if (!parsedData) return;

    // Handle different message types
    if (parsedData.type === 'error') {
      logger.error('WebSocket error message from AngelOne:', parsedData.message);
      return;
    }

    // Price update message
    if (parsedData.token || parsedData.tk) {
      const token = parsedData.token || parsedData.tk;
      const ltp = parsedData.last_traded_price
        ? parsedData.last_traded_price / 100
        : parsedData.ltp || parsedData.lp || 0;

      const stockData = {
        token,
        ltp,
        change: parsedData.change || parsedData.ch || 0,
        changePercent: parsedData.change_percent || parsedData.chp || 0,
        volume: parsedData.volume_trade_for_the_day || parsedData.v || 0,
        high: parsedData.high_price_of_the_day ? parsedData.high_price_of_the_day / 100 : 0,
        low: parsedData.low_price_of_the_day ? parsedData.low_price_of_the_day / 100 : 0,
        open: parsedData.open_price_of_the_day ? parsedData.open_price_of_the_day / 100 : 0,
        close: parsedData.closed_price || parsedData.cp || 0,
      };

      // Queue for batch DB update
      this.pendingBatchUpdates.set(token, stockData);

      // Immediately emit to Socket.IO clients in the room
      if (this.io) {
        this.io.to(`stock:${token}`).emit('price:update', stockData);
      }

      this.buildCandle(token, stockData);
    }
  }

  /**
   * Parse binary message from AngelOne WebSocket
   * Based on AngelOne SmartAPI binary protocol
   * @param {Buffer} buffer
   */
  parseBinaryMessage(buffer) {
    try {
      // AngelOne binary protocol structure (approximate)
      if (buffer.length < 8) return null;

      const subscriptionMode = buffer.readUInt8(0);
      const exchangeType = buffer.readUInt8(1);
      const token = buffer.slice(2, 27).toString('utf8').replace(/\0/g, '').trim();
      const sequenceNumber = buffer.readBigInt64BE(27);
      const exchangeTimestamp = buffer.readBigInt64BE(35);
      const ltp = buffer.readInt32BE(43);
      const lastTradedQty = buffer.readInt32BE(47);
      const avgTradedPrice = buffer.readInt32BE(51);
      const volume = buffer.readInt32BE(55);

      return {
        token,
        subscriptionMode,
        exchangeType,
        ltp: ltp / 100, // AngelOne sends price * 100
        last_traded_quantity: lastTradedQty,
        avg_traded_price: avgTradedPrice / 100,
        volume_trade_for_the_day: volume,
        timestamp: Number(exchangeTimestamp),
      };
    } catch (err) {
      // Could not parse binary, try as JSON
      try {
        return JSON.parse(buffer.toString());
      } catch {
        return null;
      }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 20000); // Every 20 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat ping to keep connection alive
   */
  sendHeartbeat() {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send('ping');
      } catch (error) {
        logger.error('Error sending heartbeat:', error.message);
      }
    }
  }

  /**
   * Start batch interval to save stock prices to DB
   */
  startBatchUpdateInterval() {
    this.batchUpdateInterval = setInterval(async () => {
      await this.flushBatchUpdates();
    }, 2000); // Every 2 seconds
  }

  /**
   * Stop batch update interval
   */
  stopBatchUpdateInterval() {
    if (this.batchUpdateInterval) {
      clearInterval(this.batchUpdateInterval);
      this.batchUpdateInterval = null;
    }
  }

  /**
   * Flush pending batch updates to MongoDB
   */
  async flushBatchUpdates() {
    if (this.pendingBatchUpdates.size === 0) return;

    const updates = new Map(this.pendingBatchUpdates);
    this.pendingBatchUpdates.clear();

    const bulkOps = [];
    for (const [token, stockData] of updates.entries()) {
      const updateDoc = {
        ltp: stockData.ltp,
        lastUpdated: new Date(),
      };

      if (stockData.change !== undefined) updateDoc.change = stockData.change;
      if (stockData.changePercent !== undefined) updateDoc.changePercent = stockData.changePercent;
      if (stockData.volume) updateDoc.volume = stockData.volume;
      if (stockData.high) updateDoc.high = stockData.high;
      if (stockData.low) updateDoc.low = stockData.low;
      if (stockData.open) updateDoc.open = stockData.open;
      if (stockData.close) updateDoc.close = stockData.close;

      bulkOps.push({
        updateOne: {
          filter: { token },
          update: { $set: updateDoc },
        },
      });
    }

    if (bulkOps.length > 0) {
      try {
        await Stock.bulkWrite(bulkOps, { ordered: false });
      } catch (error) {
        logger.error('Error flushing batch stock updates:', error.message);
      }
    }

    // Flush completed candles to MongoDB
    if (this.completedCandles.length > 0) {
      const toSave = [...this.completedCandles];
      this.completedCandles = [];
      setImmediate(() => this.saveCompletedCandles(toSave));
    }
  }

  /**
   * Build or update the current 1-minute candle for a token
   * @param {string} token
   * @param {Object} stockData
   */
  buildCandle(token, stockData) {
    const now = Date.now();
    const candleStart = now - (now % 60000); // floor to current minute

    const existing = this.currentCandles.get(token);

    if (!existing || existing.timestamp !== candleStart) {
      if (existing) {
        this.completedCandles.push({ ...existing });
      }
      this.currentCandles.set(token, {
        token,
        symbol: stockData.symbol || token,
        exchange: stockData.exchange || 'NSE',
        timestamp: candleStart,
        open: stockData.ltp,
        high: stockData.ltp,
        low: stockData.ltp,
        close: stockData.ltp,
        volume: stockData.volume || 0,
      });
    } else {
      existing.high = Math.max(existing.high, stockData.ltp);
      existing.low = Math.min(existing.low, stockData.ltp);
      existing.close = stockData.ltp;
      existing.volume += stockData.volume || 0;
    }

    const candle = this.currentCandles.get(token);
    if (this.io) {
      this.io.to(`stock:${token}`).emit('candle:update', {
        token,
        time: Math.floor(candle.timestamp / 1000),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
    }
  }

  /**
   * Persist completed candles to MongoDB via bulkWrite upsert
   * @param {Array} candles
   */
  async saveCompletedCandles(candles) {
    try {
      const StockCandleModel = require('../models/StockCandle');
      const bulkOps = candles.map((c) => ({
        updateOne: {
          filter: { token: c.token, interval: '1min', timestamp: new Date(c.timestamp) },
          update: {
            $set: {
              symbol: c.symbol,
              exchange: c.exchange,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            },
          },
          upsert: true,
        },
      }));
      await StockCandleModel.bulkWrite(bulkOps, { ordered: false });
      logger.debug(`Saved ${candles.length} completed candles to MongoDB`);
    } catch (err) {
      logger.error('saveCompletedCandles error:', err.message);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached. WebSocket will not reconnect.');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    logger.info(
      `Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(async () => {
      if (this.jwtToken && this.feedToken && this.clientCode) {
        await this.connect(this.jwtToken, this.feedToken, this.clientCode);
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.stopHeartbeat();
    this.stopBatchUpdateInterval();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        logger.error('Error closing WebSocket:', err.message);
      }
      this.ws = null;
    }

    this.isConnected = false;
    logger.info('AngelOne WebSocket disconnected.');
  }

  /**
   * Get list of currently subscribed tokens
   */
  getSubscribedTokens() {
    return Array.from(this.subscribedTokens.keys());
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      subscribedTokensCount: this.subscribedTokens.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

module.exports = new AngelOneWebSocketService();
