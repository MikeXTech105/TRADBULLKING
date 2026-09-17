const axios = require('axios');
const logger = require('../utils/logger');

// AngelOne session state stored in module scope
let sessionState = {
  jwtToken: null,
  feedToken: null,
  refreshToken: null,
  clientCode: null,
  tokenExpiry: null,
};

const BASE_URL = process.env.ANGELONE_BASE_URL || 'https://apiconnect.angelone.in';
const API_KEY = process.env.ANGELONE_API_KEY || 'pjdnChz4';

/**
 * Get common headers for AngelOne API calls
 * @param {string} jwtToken - Optional JWT token override
 */
const getHeaders = (jwtToken = null) => {
  const token = jwtToken || sessionState.jwtToken;
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '106.193.147.98',
    'X-MACAddress': 'fe80::216e:6507:4b90:3719',
    'X-PrivateKey': API_KEY,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Generate a new session by logging in with credentials
 * @param {string} clientcode
 * @param {string} password
 * @param {string} totp
 */
const generateSession = async (clientcode, password, totp) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`,
      { clientcode, password, totp },
      { headers: getHeaders() }
    );

    const data = response.data;

    if (data.status && data.data) {
      sessionState.jwtToken = data.data.jwtToken;
      sessionState.feedToken = data.data.feedToken;
      sessionState.refreshToken = data.data.refreshToken;
      sessionState.clientCode = clientcode;
      // Token expires in 24 hours approximately
      sessionState.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

      logger.info('AngelOne session generated successfully.');
      return {
        jwtToken: data.data.jwtToken,
        feedToken: data.data.feedToken,
        refreshToken: data.data.refreshToken,
        clientCode: clientcode,
      };
    }

    throw new Error(data.message || 'Session generation failed');
  } catch (error) {
    logger.error('AngelOne generateSession error:', error.message);
    throw error;
  }
};

/**
 * Refresh the session using refresh token
 */
const refreshSession = async () => {
  try {
    if (!sessionState.refreshToken || !sessionState.clientCode) {
      throw new Error('No refresh token or client code available');
    }

    const response = await axios.post(
      `${BASE_URL}/rest/auth/angelbroking/jwt/v1/generateTokens`,
      {
        refreshToken: sessionState.refreshToken,
      },
      { headers: getHeaders() }
    );

    const data = response.data;

    if (data.status && data.data) {
      sessionState.jwtToken = data.data.jwtToken;
      sessionState.feedToken = data.data.feedToken;
      sessionState.refreshToken = data.data.refreshToken;
      sessionState.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

      logger.info('AngelOne session refreshed successfully.');
      return {
        jwtToken: data.data.jwtToken,
        feedToken: data.data.feedToken,
        refreshToken: data.data.refreshToken,
      };
    }

    throw new Error(data.message || 'Session refresh failed');
  } catch (error) {
    logger.error('AngelOne refreshSession error:', error.message);
    throw error;
  }
};

/**
 * Check if current session is valid (not expired)
 */
const isSessionValid = () => {
  return (
    sessionState.jwtToken !== null &&
    sessionState.tokenExpiry !== null &&
    Date.now() < sessionState.tokenExpiry
  );
};

/**
 * Get current session state
 */
const getSession = () => ({ ...sessionState });

/**
 * Set session manually (e.g., from stored credentials)
 */
const setSession = ({ jwtToken, feedToken, refreshToken, clientCode }) => {
  sessionState.jwtToken = jwtToken;
  sessionState.feedToken = feedToken;
  sessionState.refreshToken = refreshToken;
  sessionState.clientCode = clientCode;
  sessionState.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
};

/**
 * Clear session
 */
const clearSession = () => {
  sessionState = {
    jwtToken: null,
    feedToken: null,
    refreshToken: null,
    clientCode: null,
    tokenExpiry: null,
  };
};

module.exports = {
  BASE_URL,
  API_KEY,
  generateSession,
  refreshSession,
  isSessionValid,
  getSession,
  setSession,
  clearSession,
  getHeaders,
};
