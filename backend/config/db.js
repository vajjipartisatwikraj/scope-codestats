const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Fix IPv6 resolution issue in Node.js v17+:
    // 'localhost' may resolve to '::1' (IPv6) but MongoDB typically binds to 127.0.0.1 (IPv4)
    let mongoUri = process.env.MONGODB_URI;
    if (mongoUri.includes('localhost')) {
      mongoUri = mongoUri.replace(/localhost/g, '127.0.0.1');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // Socket timeout
      connectTimeoutMS: 10000, // Connection timeout
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 1, // Minimum number of connections in the pool
    });

    console.log('MongoDB Connected Successfully');

    // Safely log part of the connection string, hiding credentials if present
    const connectionString = process.env.MONGODB_URI;
    let logSafeDbUrl = 'localhost database';

    if (connectionString.includes('@')) {
      // For URIs with credentials (user:pass@host/db)
      logSafeDbUrl = connectionString.split('@')[1];
    } else if (connectionString.includes('://')) {
      // For URIs without credentials (mongodb://host/db)
      logSafeDbUrl = connectionString.split('://')[1];
    }

    console.log('Database URL:', logSafeDbUrl);

    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Don't exit process, let the application handle reconnection
    throw err;
  }
};

module.exports = connectDB; 
