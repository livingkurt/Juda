const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
  body('timezone').optional().isString(),
  body('wake_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);

module.exports = router;