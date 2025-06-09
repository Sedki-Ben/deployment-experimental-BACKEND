const express = require('express');
const { body, check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// @route   POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ name, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          location: user.location,
          bio: user.bio,
          profession: user.profession,
          website: user.website,
          twitter: user.twitter,
          linkedin: user.linkedin
        }
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/logout
router.post('/logout', auth, authController.logout);

// @route   GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/auth/profile
router.put('/profile', [auth, authController.uploadProfileImage], authController.updateProfile);

// @route   PUT /api/auth/password
router.put('/password', [
  auth,
  check('currentPassword', 'Current password is required').exists(),
  check('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 })
], authController.changePassword);

// Optional alias route: /change-password
router.put('/change-password', [
  auth,
  check('currentPassword', 'Current password is required').exists(),
  check('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 })
], authController.changePassword);

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', [
  check('email', 'Please include a valid email').isEmail()
], authController.forgotPassword);

// @route   POST /api/auth/reset-password/:token
router.post('/reset-password/:token', [
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], authController.resetPassword);

// @route   PUT /api/auth/language
router.put('/language', auth, authController.updateLanguage);

// Admin routes
router.get('/users', [auth, isAdmin], authController.getAllUsers);
router.put('/users/:id/role', [
  auth,
  isAdmin,
  check('role').isIn(['user', 'writer', 'admin'])
], authController.updateUserRole);
router.delete('/users/:id', [auth, isAdmin], authController.deleteUser);

module.exports = router;
