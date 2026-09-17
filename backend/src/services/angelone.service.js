const axios = require('axios');
const angeloneConfig = require('../config/angelone');
const logger = require('../utils/logger');

const BASE_URL = process.env.ANGELONE_BASE_URL || 'https://apiconnect.angelone.in';

/**
 * Build axios headers for AngelOne API
 * @param {string} jwtToken - Optional JWT token
 */
const buildHeaders = (jwtToken = null) => {
  return angeloneConfig.getHeaders(jwtToken);
};

/**
 * Generate AngelOne session
 * @param {string} clientId
 * @param {string} password
 * @param {string} totp - Time-based OTP
 */
const generateSession = async (clientId, password, totp) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`,
      {
        clientcode: clientId,
        password: password,
        totp: totp,
      },
      {
        headers: buildHeaders(),
        timeout: 15000,
      }
    );

    if (response.data && response.data.status) {
      const sessionData = response.data.data;
      logger.info(`AngelOne session generated for client: ${clientId}`);
      return {
        success: true,
        jwtToken: sessionData.jwtToken,
        feedToken: sessionData.feedToken,
        refreshToken: sessionData.refreshToken,
        clientCode: clientId,
      };
    }

    throw new Error(response.data.message || 'Failed to generate session');
  } catch (error) {
    logger.error('AngelOne generateSession error:', error.message);
    throw error;
  }
};

/**
 * Get user profile from AngelOne
 * @param {string} jwtToken
 */
const getProfile = async (jwtToken) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/rest/secure/angelbroking/user/v1/getProfile`,
      {
        headers: buildHeaders(jwtToken),
        timeout: 15000,
      }
    );

    if (response.data && response.data.status) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to get profile');
  } catch (error) {
    logger.error('AngelOne getProfile error:', error.message);
    throw error;
  }
};

/**
 * Search for a scrip/instrument
 * @param {string} exchange - NSE, BSE, etc.
 * @param {string} searchscrip - Search keyword
 * @param {string} jwtToken
 */
const searchScrip = async (exchange, searchscrip, jwtToken) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/rest/secure/angelbroking/order/v1/searchScrip`,
      {
        exchange,
        searchscrip,
      },
      {
        headers: buildHeaders(jwtToken),
        timeout: 15000,
      }
    );

    if (response.data && response.data.status) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to search scrip');
  } catch (error) {
    logger.error('AngelOne searchScrip error:', error.message);
    throw error;
  }
};

/**
 * Get Last Traded Price for a symbol
 * @param {string} exchange
 * @param {string} tradingsymbol
 * @param {string} symboltoken
 * @param {string} jwtToken
 */
const getLTP = async (exchange, tradingsymbol, symboltoken, jwtToken) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/rest/secure/angelbroking/order/v1/getLtpData`,
      {
        exchange,
        tradingsymbol,
        symboltoken,
      },
      {
        headers: buildHeaders(jwtToken),
        timeout: 15000,
      }
    );

    if (response.data && response.data.status) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to get LTP');
  } catch (error) {
    logger.error('AngelOne getLTP error:', error.message);
    throw error;
  }
};

/**
 * Get market data for multiple tokens
 * @param {string} mode - FULL, OHLC, or LTP
 * @param {Object} exchangeTokens - { NSE: ['2885', '1594'], BSE: [...] }
 * @param {string} jwtToken
 */
const getMarketData = async (mode, exchangeTokens, jwtToken) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/rest/secure/angelbroking/market/v1/quote/`,
      {
        mode,
        exchangeTokens,
      },
      {
        headers: buildHeaders(jwtToken),
        timeout: 15000,
      }
    );

    if (response.data && response.data.status) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to get market data');
  } catch (error) {
    logger.error('AngelOne getMarketData error:', error.message);
    throw error;
  }
};

/**
 * Get historical candle data
 * @param {Object} params - { exchange, symboltoken, interval, fromdate, todate }
 * @param {string} jwtToken
 * Intervals: ONE_MINUTE, THREE_MINUTE, FIVE_MINUTE, TEN_MINUTE, FIFTEEN_MINUTE, THIRTY_MINUTE,
 *             ONE_HOUR, ONE_DAY
 */
const getHistoricalData = async (params, jwtToken) => {
  try {
    const { exchange, symboltoken, interval, fromdate, todate } = params;

    const response = await axios.post(
      `${BASE_URL}/rest/secure/angelbroking/historical/v1/getCandleData`,
      {
        exchange,
        symboltoken,
        interval,
        fromdate,
        todate,
      },
      {
        headers: buildHeaders(jwtToken),
        timeout: 30000,
      }
    );

    if (response.data && response.data.status) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to get historical data');
  } catch (error) {
    logger.error('AngelOne getHistoricalData error:', error.message);
    throw error;
  }
};

/**
 * Get all instruments from AngelOne OpenAPI
 */
const getAllInstruments = async () => {
  try {
    const response = await axios.get(
      'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json',
      {
        timeout: 60000,
        headers: {
          Accept: 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('AngelOne getAllInstruments error:', error.message);
    throw error;
  }
};

/**
 * Get funds/limits
 * @param {string} jwtToken
 */
const getFunds = async (jwtToken) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/rest/secure/angelbroking/user/v1/getRMS`,
      {
        headers: buildHeaders(jwtToken),
        timeout: 15000,
      }
    );

    if (response.data && response.data.status) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to get funds');
  } catch (error) {
    logger.error('AngelOne getFunds error:', error.message);
    throw error;
  }
};

module.exports = {
  generateSession,
  getProfile,
  searchScrip,
  getLTP,
  getMarketData,
  getHistoricalData,
  getAllInstruments,
  getFunds,
};
