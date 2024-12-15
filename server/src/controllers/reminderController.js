const { Reminder, CompletionRecord } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all reminders for the current user
 */
const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: CompletionRecord,
        as: 'completionRecords',
        required: false,
        where: {
          scheduled_date: new Date().toISOString().split('T')[0]
        }
      }],
      order: [['start_time', 'ASC']]
    });

    res.json({
      status: 'success',
      data: { reminders }
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching reminders'
    });
  }
};

/**
 * Get a single reminder by ID
 */
const getReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      include: [{
        model: CompletionRecord,
        as: 'completionRecords',
        required: false,
        limit: 30,
        order: [['scheduled_date', 'DESC']]
      }]
    });

    if (!reminder) {
      return res.status(404).json({
        status: 'error',
        message: 'Reminder not found'
      });
    }

    res.json({
      status: 'success',
      data: { reminder }
    });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching reminder'
    });
  }
};

/**
 * Create a new reminder
 */
const createReminder = async (req, res) => {
  try {
    const reminderData = {
      ...req.body,
      user_id: req.user.id
    };

    const reminder = await Reminder.create(reminderData);

    res.status(201).json({
      status: 'success',
      data: { reminder }
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating reminder'
    });
  }
};

/**
 * Update a reminder
 */
const updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!reminder) {
      return res.status(404).json({
        status: 'error',
        message: 'Reminder not found'
      });
    }

    await reminder.update(req.body);

    res.json({
      status: 'success',
      data: { reminder }
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating reminder'
    });
  }
};

/**
 * Delete a reminder
 */
const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!reminder) {
      return res.status(404).json({
        status: 'error',
        message: 'Reminder not found'
      });
    }

    await reminder.destroy();

    res.json({
      status: 'success',
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting reminder'
    });
  }
};

/**
 * Bulk create reminders
 */
const bulkCreateReminders = async (req, res) => {
  try {
    const reminders = req.body.reminders.map(reminder => ({
      ...reminder,
      user_id: req.user.id
    }));

    const createdReminders = await Reminder.bulkCreate(reminders, {
      validate: true
    });

    res.status(201).json({
      status: 'success',
      data: { reminders: createdReminders }
    });
  } catch (error) {
    console.error('Bulk create reminders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating reminders'
    });
  }
};

/**
 * Bulk update reminders
 */
const bulkUpdateReminders = async (req, res) => {
  try {
    const updates = req.body.reminders;
    const updatedReminders = [];

    for (const update of updates) {
      const reminder = await Reminder.findOne({
        where: {
          id: update.id,
          user_id: req.user.id
        }
      });

      if (reminder) {
        await reminder.update(update);
        updatedReminders.push(reminder);
      }
    }

    res.json({
      status: 'success',
      data: { reminders: updatedReminders }
    });
  } catch (error) {
    console.error('Bulk update reminders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating reminders'
    });
  }
};

/**
 * Bulk delete reminders
 */
const bulkDeleteReminders = async (req, res) => {
  try {
    const { ids } = req.body;

    await Reminder.destroy({
      where: {
        id: { [Op.in]: ids },
        user_id: req.user.id
      }
    });

    res.json({
      status: 'success',
      message: 'Reminders deleted successfully'
    });
  } catch (error) {
    console.error('Bulk delete reminders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting reminders'
    });
  }
};

module.exports = {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  bulkCreateReminders,
  bulkUpdateReminders,
  bulkDeleteReminders
};