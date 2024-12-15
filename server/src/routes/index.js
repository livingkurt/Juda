const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const reminderRoutes = require('./reminders');
const completionRoutes = require('./completion');
const settingsRoutes = require('./settings');

// Mount routes
router.use('/auth', authRoutes);
router.use('/reminders', reminderRoutes);
router.use('/completion', completionRoutes);
router.use('/settings', settingsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;