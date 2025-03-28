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
    console.log('Database URL:', process.env.MONGODB_URI.split('@')[1]); // Log only part of the URL for security
    
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Don't exit process, let the application handle reconnection
    throw err;
  }
};

module.exports = connectDB; 