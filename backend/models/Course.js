const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
  },
  courseLink: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    default: 'TBD'
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'Intermediate'
  },
  category: {
    type: String,
    enum: ['algorithms', 'data-structures', 'competitive', 'problem-solving', 'other'],
    default: 'other'
  },
  duration: {
    type: String,
    default: '8 weeks'
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 4.5
  },
  topics: [{
    type: String
  }],
  prerequisites: [{
    type: String
  }],
  resources: [{
    title: String,
    link: String,
    type: {
      type: String,
      enum: ['Video', 'Article', 'Practice', 'Quiz']
    }
  }],
  registeredStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedResources: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resources'
    }],
    startDate: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }],
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps before saving
courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);