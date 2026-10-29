const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const logger = require('../utils/logger');

let handlersAttached = false;

const attachConnectionHandlers = () => {
  if (handlersAttached) return;
  handlersAttached = true;

  mongoose.connection.on('error', (err) => {
    logger.error('DB', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('DB', 'disconnected, reconnecting');
  });

  mongoose.connection.on('reconnected', () => {
    logger.ready('DB', 'reconnected');
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connects to MongoDB.
 *
 * By default one failed attempt throws, which is what the standalone scripts want.
 * The server passes `{ maxAttempts: Infinity }` so a short database outage at boot
 * (the database restarting, a slow network) is retried with a growing pause (1 s up
 * to 30 s) instead of crashing the process.
 */
const connectDB = async ({ maxAttempts = 1 } = {}) => {
  if (!process.env.MONGODB_URI) {
    const err = new Error('MONGODB_URI is not defined in environment variables');
    logger.error('DB', err);
    throw err;
  }

  // Fix IPv6 resolution issue in Node.js v17+:
  // 'localhost' may resolve to '::1' (IPv6) but MongoDB typically binds to 127.0.0.1 (IPv4)
  let mongoUri = process.env.MONGODB_URI;
  if (mongoUri.includes('localhost')) {
    mongoUri = mongoUri.replace(/localhost/g, '127.0.0.1');
  }

  attachConnectionHandlers();

  for (let attempt = 1; ; attempt += 1) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 45000, // Socket timeout
        connectTimeoutMS: 10000, // Connection timeout
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 1, // Minimum number of connections in the pool
      });

      // Log host and database only, never credentials
      let logSafeDbUrl = 'localhost database';
      if (mongoUri.includes('@')) {
        // For URIs with credentials (user:pass@host/db)
        logSafeDbUrl = mongoUri.split('@')[1];
      } else if (mongoUri.includes('://')) {
        // For URIs without credentials (mongodb://host/db)
        logSafeDbUrl = mongoUri.split('://')[1];
      }
      logger.ready('DB', logSafeDbUrl.split('?')[0]);

      return conn;
    } catch (err) {
      if (attempt >= maxAttempts) {
        logger.error('DB', err);
        throw err;
      }
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt - 1, 5));
      logger.warn('DB', `connection attempt ${attempt} failed (${err.message}), retrying in ${delay / 1000}s`);
      await wait(delay);
    }
  }
};

module.exports = connectDB;
