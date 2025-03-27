const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');

// @route   GET /api/courses
// @desc    Get all courses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/courses/saved
// @desc    Get user's saved courses
// @access  Private
router.get('/saved', auth, async (req, res) => {
  try {
    const courses = await Course.find({ savedBy: req.user.id });
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/courses/:id/save
// @desc    Save a course
// @access  Private
router.post('/:id/save', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    // Check if already saved
    if (course.savedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Course already saved' });
    }
    
    course.savedBy.push(req.user.id);
    await course.save();
    
    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/courses/:id/save
// @desc    Unsave a course
// @access  Private
router.delete('/:id/save', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    // Check if not saved
    if (!course.savedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Course not saved' });
    }
    
    course.savedBy = course.savedBy.filter(id => id.toString() !== req.user.id);
    await course.save();
    
    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    // Check if already enrolled
    if (course.registeredStudents.some(student => student.student.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Already enrolled in this course' });
    }
    
    course.registeredStudents.push({
      student: req.user.id,
      progress: 0,
      completedResources: [],
      startDate: Date.now(),
      lastAccessed: Date.now()
    });
    
    // Increment student count
    course.students = course.students + 1;
    
    await course.save();
    
    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/courses/debug/count
// @desc    Get count of courses in the database
// @access  Public
router.get('/debug/count', async (req, res) => {
  try {
    const count = await Course.countDocuments();
    const courses = await Course.find().select('title').limit(5);
    res.json({ 
      count, 
      message: `Found ${count} courses in the database`,
      sampleCourses: courses
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 