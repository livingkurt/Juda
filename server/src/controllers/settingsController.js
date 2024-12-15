const { User } = require('../models');

/**
 * Update wake time settings
 */
const updateWakeTime = async (req, res) => {
  try {
    const { wake_time, timezone } = req.body;
    const user = req.user;

    await user.update({
      wake_time,
      ...(timezone && { timezone })
    });

    res.json({
      status: 'success',
      data: {
        wake_time: user.wake_time,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Update wake time error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating wake time settings'
    });
  }
};

/**
 * Get wake time settings
 */
const getWakeTime = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      status: 'success',
      data: {
        wake_time: user.wake_time,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Get wake time error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching wake time settings'
    });
  }
};

/**
 * Update notification settings
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const { enabled, notification_time, notification_types } = req.body;
    const user = req.user;

    // Store notification settings in user preferences
    const currentPreferences = user.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      notifications: {
        enabled,
        notification_time,
        notification_types
      }
    };

    await user.update({ preferences: updatedPreferences });

    res.json({
      status: 'success',
      data: {
        notifications: updatedPreferences.notifications
      }
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating notification settings'
    });
  }
};

/**
 * Get notification settings
 */
const getNotificationSettings = async (req, res) => {
  try {
    const user = req.user;
    const preferences = user.preferences || {};
    const notifications = preferences.notifications || {
      enabled: false,
      notification_time: null,
      notification_types: []
    };

    res.json({
      status: 'success',
      data: { notifications }
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching notification settings'
    });
  }
};

/**
 * Get all user settings
 */
const getAllSettings = async (req, res) => {
  try {
    const user = req.user;
    const { password: _, ...settings } = user.toJSON();

    res.json({
      status: 'success',
      data: { settings }
    });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user settings'
    });
  }
};

/**
 * Update all user settings
 */
const updateAllSettings = async (req, res) => {
  try {
    const user = req.user;
    const allowedFields = ['name', 'email', 'timezone', 'wake_time', 'preferences'];
    const updates = {};

    // Only allow updating specific fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await user.update(updates);

    const { password: _, ...updatedSettings } = user.toJSON();

    res.json({
      status: 'success',
      data: { settings: updatedSettings }
    });
  } catch (error) {
    console.error('Update all settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user settings'
    });
  }
};

module.exports = {
  updateWakeTime,
  getWakeTime,
  updateNotificationSettings,
  getNotificationSettings,
  getAllSettings,
  updateAllSettings
};