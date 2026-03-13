const { Pool } = require('pg');
const logger = require('./utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep SSL flexible — Railway requires it, local dev usually doesn't
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  logger.info('PostgreSQL pool connected');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', { error: err.message });
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
