const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation middleware
const wakeTimeValidation = [
  body('wake_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('timezone').optional().isString()
];

const notificationSettingsValidation = [
  body('enabled').isBoolean(),
  body('notification_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('notification_types')
    .optional()
    .isArray()
    .custom((value) => {
      const validTypes = ['push', 'email', 'sms'];
      return value.every(type => validTypes.includes(type));
    })
];

// Routes
router.use(auth); // Protect all settings routes

// Wake time settings
router.put('/wake-time', wakeTimeValidation, validate, settingsController.updateWakeTime);
router.get('/wake-time', settingsController.getWakeTime);

// Notification settings
router.put('/notifications', notificationSettingsValidation, validate, settingsController.updateNotificationSettings);
router.get('/notifications', settingsController.getNotificationSettings);

// User preferences
router.get('/', settingsController.getAllSettings);
router.put('/', settingsController.updateAllSettings);

module.exports = router;