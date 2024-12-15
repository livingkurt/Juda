const admin = require('firebase-admin');
const path = require('path');

class PushNotificationProvider {
  constructor() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }
    this.messaging = admin.messaging();
  }

  /**
   * Send push notification to a specific device
   */
  async sendToDevice(deviceToken, notification, data = {}) {
    try {
      const message = {
        notification,
        data,
        token: deviceToken
      };

      const response = await this.messaging.send(message);
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(deviceTokens, notification, data = {}) {
    try {
      const message = {
        notification,
        data,
        tokens: deviceTokens
      };

      const response = await this.messaging.sendMulticast(message);
      return response;
    } catch (error) {
      console.error('Error sending push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a topic
   */
  async sendToTopic(topic, notification, data = {}) {
    try {
      const message = {
        notification,
        data,
        topic
      };

      const response = await this.messaging.send(message);
      return response;
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe devices to a topic
   */
  async subscribeToTopic(deviceTokens, topic) {
    try {
      const response = await this.messaging.subscribeToTopic(deviceTokens, topic);
      return response;
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe devices from a topic
   */
  async unsubscribeFromTopic(deviceTokens, topic) {
    try {
      const response = await this.messaging.unsubscribeFromTopic(deviceTokens, topic);
      return response;
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }

  /**
   * Format reminder notification
   */
  formatReminderNotification(reminder) {
    return {
      title: reminder.title,
      body: reminder.description || 'Time for your reminder!',
      icon: 'default', // Default notification icon
      click_action: 'OPEN_REMINDER_DETAIL' // Action when notification is clicked
    };
  }

  /**
   * Format reminder data
   */
  formatReminderData(reminder) {
    return {
      reminder_id: reminder.id,
      type: 'reminder',
      created_at: new Date().toISOString()
    };
  }
}

// Create singleton instance
const pushNotificationProvider = new PushNotificationProvider();

module.exports = pushNotificationProvider;