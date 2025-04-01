const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      retryWrites: true
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
    
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Don't exit process, let the application handle reconnection
    throw err;
  }
};

module.exports = connectDB; 