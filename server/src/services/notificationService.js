const { Reminder, User } = require('../models');
const { Op } = require('sequelize');
const pushNotificationProvider = require('./pushNotificationProvider');

class NotificationService {
  constructor() {
    this.scheduledNotifications = new Map();
  }

  /**
   * Calculate the next notification time for a reminder
   */
  calculateNextNotificationTime(reminder, userWakeTime) {
    const now = new Date();
    let notificationTime = new Date();

    if (reminder.relative_to_wake && userWakeTime) {
      // Parse wake time
      const [hours, minutes] = userWakeTime.split(':').map(Number);
      notificationTime.setHours(hours);
      notificationTime.setMinutes(minutes);

      // Add minutes after wake
      notificationTime.setMinutes(notificationTime.getMinutes() + reminder.minutes_after_wake);
    } else {
      // Use absolute time
      const [hours, minutes] = reminder.start_time.split(':').map(Number);
      notificationTime.setHours(hours);
      notificationTime.setMinutes(minutes);
    }

    // If the time has passed for today, schedule for tomorrow
    if (notificationTime < now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    return notificationTime;
  }

  /**
   * Schedule notifications for a user's reminders
   */
  async scheduleUserNotifications(userId) {
    try {
      // Get user and their reminders
      const user = await User.findByPk(userId, {
        include: [{
          model: Reminder,
          as: 'reminders'
        }]
      });

      if (!user || !user.reminders) return;

      // Clear existing scheduled notifications for this user
      this.clearUserNotifications(userId);

      // Schedule new notifications
      for (const reminder of user.reminders) {
        const nextNotificationTime = this.calculateNextNotificationTime(reminder, user.wake_time);

        // Create timeout
        const timeoutId = setTimeout(() => {
          this.sendNotification(user, reminder);
          // Reschedule for next occurrence
          this.scheduleUserNotifications(userId);
        }, nextNotificationTime.getTime() - Date.now());

        // Store timeout reference
        this.scheduledNotifications.set(`${userId}-${reminder.id}`, timeoutId);
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  /**
   * Clear scheduled notifications for a user
   */
  clearUserNotifications(userId) {
    for (const [key, timeoutId] of this.scheduledNotifications.entries()) {
      if (key.startsWith(`${userId}-`)) {
        clearTimeout(timeoutId);
        this.scheduledNotifications.delete(key);
      }
    }
  }

  /**
   * Send a notification
   */
  async sendNotification(user, reminder) {
    try {
      const preferences = user.preferences?.notifications || {};

      if (!preferences.enabled) return;

      await this.sendPushNotification(user, reminder);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(user, reminder) {
    try {
      if (!user.device_tokens || user.device_tokens.length === 0) {
        return;
      }

      const notification = pushNotificationProvider.formatReminderNotification(reminder);
      const data = pushNotificationProvider.formatReminderData(reminder);

      // Send to all user devices
      await pushNotificationProvider.sendToDevices(user.device_tokens, notification, data);

      console.log(`Push notification sent to user ${user.id} for reminder: ${reminder.title}`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Schedule notifications for all users
   */
  async scheduleAllNotifications() {
    try {
      const users = await User.findAll();
      for (const user of users) {
        await this.scheduleUserNotifications(user.id);
      }
    } catch (error) {
      console.error('Error scheduling all notifications:', error);
    }
  }

  /**
   * Register a device token for a user
   */
  async registerDeviceToken(userId, deviceToken) {
    try {
      const user = await User.findByPk(userId);
      if (!user) return;

      // Add token if it doesn't exist
      if (!user.device_tokens.includes(deviceToken)) {
        user.device_tokens = [...user.device_tokens, deviceToken];
        await user.save();
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }

  /**
   * Unregister a device token for a user
   */
  async unregisterDeviceToken(userId, deviceToken) {
    try {
      const user = await User.findByPk(userId);
      if (!user) return;

      // Remove token
      user.device_tokens = user.device_tokens.filter(token => token !== deviceToken);
      await user.save();
    } catch (error) {
      console.error('Error unregistering device token:', error);
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;