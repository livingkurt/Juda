const { CompletionRecord, Reminder } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

/**
 * Update completion status for a reminder
 */
const updateCompletion = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { completion_status, completion_time } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Verify reminder belongs to user
    const reminder = await Reminder.findOne({
      where: {
        id: reminderId,
        user_id: req.user.id
      }
    });

    if (!reminder) {
      return res.status(404).json({
        status: 'error',
        message: 'Reminder not found'
      });
    }

    // Find or create completion record for today
    const [completionRecord] = await CompletionRecord.findOrCreate({
      where: {
        reminder_id: reminderId,
        user_id: req.user.id,
        scheduled_date: today
      },
      defaults: {
        completion_status: false
      }
    });

    // Update completion status
    await completionRecord.update({
      completion_status,
      completion_time: completion_time || (completion_status ? new Date() : null)
    });

    res.json({
      status: 'success',
      data: { completionRecord }
    });
  } catch (error) {
    console.error('Update completion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating completion status'
    });
  }
};

/**
 * Get completion history
 */
const getCompletionHistory = async (req, res) => {
  try {
    const { start_date, end_date, reminder_id } = req.query;
    const where = {
      user_id: req.user.id
    };

    if (reminder_id) {
      where.reminder_id = reminder_id;
    }

    if (start_date || end_date) {
      where.scheduled_date = {};
      if (start_date) {
        where.scheduled_date[Op.gte] = start_date;
      }
      if (end_date) {
        where.scheduled_date[Op.lte] = end_date;
      }
    }

    const completionRecords = await CompletionRecord.findAll({
      where,
      include: [{
        model: Reminder,
        as: 'reminder',
        attributes: ['title', 'description']
      }],
      order: [['scheduled_date', 'DESC']]
    });

    res.json({
      status: 'success',
      data: { completionRecords }
    });
  } catch (error) {
    console.error('Get completion history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching completion history'
    });
  }
};

/**
 * Get completion statistics
 */
const getCompletionStats = async (req, res) => {
  try {
    const { start_date, end_date, reminder_id } = req.query;
    const where = {
      user_id: req.user.id
    };

    if (reminder_id) {
      where.reminder_id = reminder_id;
    }

    if (start_date || end_date) {
      where.scheduled_date = {};
      if (start_date) {
        where.scheduled_date[Op.gte] = start_date;
      }
      if (end_date) {
        where.scheduled_date[Op.lte] = end_date;
      }
    }

    const stats = await CompletionRecord.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('*')), 'total'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('completion_status'), 'integer')), 'completed'],
        [sequelize.fn('AVG', sequelize.cast(sequelize.col('completion_status'), 'float')), 'completion_rate']
      ],
      group: ['reminder_id'],
      include: [{
        model: Reminder,
        as: 'reminder',
        attributes: ['title']
      }]
    });

    // Calculate streaks
    const streaks = await calculateStreaks(where);

    res.json({
      status: 'success',
      data: {
        stats,
        streaks
      }
    });
  } catch (error) {
    console.error('Get completion stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching completion statistics'
    });
  }
};

/**
 * Bulk update completion records
 */
const bulkUpdateCompletions = async (req, res) => {
  try {
    const { completions } = req.body;
    const updatedRecords = [];

    for (const completion of completions) {
      const { reminder_id, scheduled_date, completion_status, completion_time } = completion;

      // Verify reminder belongs to user
      const reminder = await Reminder.findOne({
        where: {
          id: reminder_id,
          user_id: req.user.id
        }
      });

      if (reminder) {
        const [record] = await CompletionRecord.findOrCreate({
          where: {
            reminder_id,
            user_id: req.user.id,
            scheduled_date
          },
          defaults: {
            completion_status: false
          }
        });

        await record.update({
          completion_status,
          completion_time: completion_time || (completion_status ? new Date() : null)
        });

        updatedRecords.push(record);
      }
    }

    res.json({
      status: 'success',
      data: { completionRecords: updatedRecords }
    });
  } catch (error) {
    console.error('Bulk update completions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating completion records'
    });
  }
};

/**
 * Helper function to calculate streaks
 */
async function calculateStreaks(where) {
  const records = await CompletionRecord.findAll({
    where,
    order: [['scheduled_date', 'DESC']],
    raw: true
  });

  const streaks = {};
  let currentStreak = 0;
  let longestStreak = 0;

  for (let i = 0; i < records.length; i++) {
    if (records[i].completion_status) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    current: currentStreak,
    longest: longestStreak
  };
}

module.exports = {
  updateCompletion,
  getCompletionHistory,
  getCompletionStats,
  bulkUpdateCompletions
};