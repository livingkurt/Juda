const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const reminderController = require('../controllers/reminderController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation middleware
const reminderValidation = [
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('relative_to_wake').isBoolean(),
  body('minutes_after_wake')
    .optional()
    .isInt({ min: 0 })
    .custom((value, { req }) => {
      if (req.body.relative_to_wake && value === undefined) {
        throw new Error('minutes_after_wake is required when relative_to_wake is true');
      }
      return true;
    }),
  body('repeat_pattern')
    .optional()
    .isObject()
    .custom((value) => {
      if (value) {
        const { type, interval } = value;
        const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];

        if (!type || !validTypes.includes(type)) {
          throw new Error('Invalid repeat pattern type');
        }

        if (!interval || !Number.isInteger(interval) || interval < 1) {
          throw new Error('Invalid interval value');
        }
      }
      return true;
    })
];

// Routes
router.use(auth); // Protect all reminder routes

router.get('/', reminderController.getReminders);
router.post('/', reminderValidation, validate, reminderController.createReminder);
router.get('/:id', reminderController.getReminder);
router.put('/:id', reminderValidation, validate, reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

// Bulk operations
router.post('/bulk/create', reminderController.bulkCreateReminders);
router.put('/bulk/update', reminderController.bulkUpdateReminders);
router.delete('/bulk/delete', reminderController.bulkDeleteReminders);

module.exports = router;