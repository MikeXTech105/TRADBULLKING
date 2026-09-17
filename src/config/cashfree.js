const axios = require('axios');

const CASHFREE_BASE_URL = process.env.CASHFREE_BASE_URL || 'https://sandbox.cashfree.com/pg';
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'TEST112371024e009dc89d25aa1d6bed20173211';
const CASHFREE_SECRET_KEY =
  process.env.CASHFREE_SECRET_KEY ||
  'cfsk_ma_test_a08d9708271147456d6155c5393e2054_b617f4b4';
const CASHFREE_API_VERSION = '2023-08-01';

/**
 * Get Cashfree API headers
 */
const getCashfreeHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-api-version': CASHFREE_API_VERSION,
  'x-client-id': CASHFREE_APP_ID,
  'x-client-secret': CASHFREE_SECRET_KEY,
});

/**
 * Get Cashfree axios instance
 */
const getCashfreeAxios = () => {
  return axios.create({
    baseURL: CASHFREE_BASE_URL,
    headers: getCashfreeHeaders(),
    timeout: 30000,
  });
};

module.exports = {
  CASHFREE_BASE_URL,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
  CASHFREE_API_VERSION,
  getCashfreeHeaders,
  getCashfreeAxios,
};
