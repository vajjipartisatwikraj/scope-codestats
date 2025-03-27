const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  organizer: {
    type: String,
    required: true
  },
  organizerLogo: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['competition', 'hackathon', 'internship', 'workshop', 'other'],
    default: 'competition'
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    required: true
  },
  deadline: {
    type: String,
    required: true
  },
  registrationOpen: {
    type: Boolean,
    default: true
  },
  location: {
    type: String,
    default: 'Online'
  },
  link: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  prize: {
    type: String,
    default: ''
  },
  eligibility: {
    departments: [{
      type: String,
      enum: ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE', 'ALL']
    }],
    graduatingYear: {
      type: Number,
      default: new Date().getFullYear() + 4
    },
    minimumCGPA: {
      type: Number,
      min: 0,
      max: 10
    },
    otherRequirements: [String]
  },
  applicationLink: {
    type: String,
    default: function() {
      return this.link;
    }
  },
  registeredStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Registered', 'Applied', 'Selected', 'Rejected', 'Withdrawn'],
      default: 'Registered'
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
opportunitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Opportunity', opportunitySchema);