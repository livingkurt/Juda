const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const completionController = require('../controllers/completionController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation middleware
const completionValidation = [
  body('completion_status').isBoolean(),
  body('completion_time').optional().isISO8601()
];

const historyValidation = [
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('reminder_id').optional().isUUID()
];

// Routes
router.use(auth); // Protect all completion routes

// Mark reminder as complete/incomplete
router.post('/:reminderId', completionValidation, validate, completionController.updateCompletion);

// Get completion history
router.get('/history', historyValidation, validate, completionController.getCompletionHistory);

// Get completion statistics
router.get('/stats', historyValidation, validate, completionController.getCompletionStats);

// Bulk completion updates
router.post('/bulk', completionController.bulkUpdateCompletions);

module.exports = router;