const mongoose = require('mongoose');

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'user' field.
 * When a User is deleted, all Note documents with matching 'user' field
 * are automatically deleted via cascade deletion middleware in User.js
 * 
 * Related deletion query: note.deleteMany({ user: userId })
 * Note: This model uses lowercase 'note' as the collection name
 */

const NoteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  cohort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cohort',
    required: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'module',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'question',
    required: true
  },
  notes: {
    type: String,
    default: ''
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

// Update the updatedAt field on save
NoteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('note', NoteSchema); 