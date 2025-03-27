const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Middleware to authenticate token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user data
router.get('/user', auth, async (req, res) => {
  try {
    // Return user data without sensitive information
    const userData = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      department: req.user.department,
      section: req.user.section,
      rollNumber: req.user.rollNumber,
      userType: req.user.userType,
      gender: req.user.gender,
      mobileNumber: req.user.mobileNumber,
      graduatingYear: req.user.graduatingYear,
      profiles: req.user.profiles,
      skills: req.user.skills,
      interests: req.user.interests,
      about: req.user.about,
      linkedinUrl: req.user.linkedinUrl
    };
    
    res.json(userData);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const validDepartments = ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE'];
const validSections = ['None', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Register user
router.post('/register',
  [
    // Name validation
    body('name').trim().notEmpty().withMessage('Name is required'),
    
    // Roll number validation
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required')
      .custom(async value => {
        const user = await User.findOne({ rollNumber: value });
        if (user) {
          throw new Error('Roll number already registered');
        }
        return true;
      }),
    
    // Gender validation
    body('gender').isIn(['Male', 'Female'])
      .withMessage('Gender must be Male or Female'),
    
    // Email validation
    body('email').trim().isEmail().withMessage('Invalid email address')
      .custom(value => {
        if (!value.endsWith('@mlrit.ac.in') && !value.endsWith('@mlrinstitutions.ac.in')) {
          throw new Error('Please use your MLRIT college email address');
        }
        return true;
      })
      .custom(async value => {
        const user = await User.findOne({ email: value.toLowerCase() });
        if (user) {
          throw new Error('Email already registered');
        }
        return true;
      }),
    
    // Department validation
    body('department').isIn(validDepartments)
      .withMessage('Invalid department selected'),
    
    // Section validation
    body('section').isIn(validSections)
      .withMessage('Invalid section selected'),
    
    // Graduating year validation
    body('graduatingYear').isInt({ min: 2024, max: 2030 })
      .withMessage('Graduating year must be between 2024 and 2030'),
    
    // Mobile number validation
    body('mobileNumber').matches(/^[6-9]\d{9}$/)
      .withMessage('Please enter a valid 10-digit mobile number')
      .custom(async value => {
        const user = await User.findOne({ mobileNumber: value });
        if (user) {
          throw new Error('Mobile number already registered');
        }
        return true;
      }),
    
    // Password validation
    body('password').isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
    
    // Confirm password validation
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        rollNumber,
        gender,
        email,
        department,
        section,
        graduatingYear,
        mobileNumber,
        password,
        linkedinUrl = '',
        about = '',
        skills = '',
        interests = '',
        profiles = {}
      } = req.body;

      const user = new User({
        name,
        rollNumber,
        gender,
        email: email.toLowerCase(),
        department,
        section,
        graduatingYear,
        mobileNumber,
        password,
        linkedinUrl,
        about,
        skills: typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : skills,
        interests: typeof interests === 'string' ? interests.split(',').map(i => i.trim()) : interests,
        profiles: {
          geeksforgeeks: profiles?.geeksforgeeks || '',
          codechef: profiles?.codechef || '',
          codeforces: profiles?.codeforces || '',
          leetcode: profiles?.leetcode || '',
          hackerrank: profiles?.hackerrank || '',
          github: profiles?.github || ''
        }
      });

      await user.save();

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          section: user.section,
          rollNumber: user.rollNumber,
          userType: user.userType
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login user
router.post('/login',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').exists().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          section: user.section,
          rollNumber: user.rollNumber,
          userType: user.userType
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Validate user details
router.post('/validate', async (req, res) => {
  try {
    const { rollNumber, mobileNumber, email } = req.body;
    
    // Create validation results object
    const validationResults = {};
    
    // Check if roll number exists (if provided)
    if (rollNumber) {
      const existingRollNumber = await User.findOne({ rollNumber });
      validationResults.rollNumberExists = !!existingRollNumber;
    }
    
    // Check if mobile number exists (if provided)
    if (mobileNumber) {
      const existingMobileNumber = await User.findOne({ mobileNumber });
      validationResults.mobileNumberExists = !!existingMobileNumber;
    }
    
    // Check if email exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      validationResults.emailExists = !!existingEmail;
    }
    
    res.json(validationResults);
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ message: 'Server error during validation' });
  }
});

module.exports = router;
