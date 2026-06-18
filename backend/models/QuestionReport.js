const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'user' field.
 * When a User is deleted, all QuestionReport documents with matching 'user' field
 * are automatically deleted via cascade deletion middleware in User.js
 * 
 * Related deletion query: QuestionReport.deleteMany({ user: userId })
 */

const QuestionReportSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  module: {
    type: Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  cohort: {
    type: Schema.Types.ObjectId,
    ref: 'Cohort',
    required: true
  },
  reportType: {
    type: String,
    enum: ['test_case_issue', 'incorrect_question', 'constraints_issue', 'technical_issue', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  adminResponse: {
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

module.exports = mongoose.model('QuestionReport', QuestionReportSchema); 