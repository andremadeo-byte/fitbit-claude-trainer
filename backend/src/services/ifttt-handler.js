/**
 * IFTTT Handler Service
 * Manages IFTTT webhook triggers and integrations
 */

const axios = require('axios');
const logger = require('../utils/logger');

class IFTTTHandler {
  constructor() {
    this.webhookKey = process.env.IFTTT_WEBHOOK_KEY;
    this.baseURL = 'https://maker.ifttt.com/trigger';
  }

  /**
   * Trigger daily insights event
   */
  async triggerDailyInsights(data) {
    return this._triggerWebhook('daily_insights', {
      value1: data.date,
      value2: data.summary,
      value3: data.goal_met ? '✅ Goal Met' : '⏳ Keep Going'
    });
  }

  /**
   * Trigger step goal achievement
   */
  async triggerStepGoalAchieved(data) {
    return this._triggerWebhook('step_goal_achieved', {
      value1: data.steps,
      value2: data.date,
      value3: `Exceeded by ${data.steps - data.goal} steps!`
    });
  }

  /**
   * Trigger sleep goal achievement
   */
  async triggerSleepGoalAchieved(data) {
    return this._triggerWebhook('sleep_goal_achieved', {
      value1: `${data.sleep_hours} hours`,
      value2: data.date,
      value3: `Sleep Quality: ${data.quality}%`
    });
  }

  /**
   * Log activity to Google Sheets
   */
  async logToGoogleSheets(data) {
    return this._triggerWebhook('log_activity_sheets', {
      value1: data.date,
      value2: JSON.stringify(data.metrics),
      value3: data.notes || ''
    });
  }

  /**
   * Send activity email
   */
  async sendActivityEmail(data) {
    return this._triggerWebhook('send_activity_email', {
      value1: data.subject,
      value2: data.body,
      value3: data.recipient || ''
    });
  }

  /**
   * Trigger smart home automation (e.g., lights)
   */
  async triggerSmartHome(data) {
    return this._triggerWebhook('goal_achieved_lights', {
      value1: data.action,
      value2: data.device,
      value3: data.intensity || ''
    });
  }

  /**
   * Send SMS notification via IFTTT
   */
  async sendSMS(data) {
    return this._triggerWebhook('send_sms_notification', {
      value1: data.phone,
      value2: data.message,
      value3: data.priority || 'normal'
    });
  }

  /**
   * Log weekly summary
   */
  async logWeeklySummary(data) {
    return this._triggerWebhook('weekly_summary', {
      value1: `Week of ${data.startDate}`,
      value2: JSON.stringify(data.summary),
      value3: data.highlights || ''
    });
  }

  /**
   * Trigger custom automation
   */
  async triggerCustom(eventName, values) {
    return this._triggerWebhook(eventName, values);
  }

  /**
   * Internal method to make webhook request
   */
  async _triggerWebhook(eventName, values) {
    try {
      const url = `${this.baseURL}/${eventName}/with/key/${this.webhookKey}`;
      
      logger.info(`Triggering IFTTT webhook: ${eventName}`);
      
      const response = await axios.post(url, values);
      
      logger.info(`IFTTT webhook triggered successfully: ${eventName}`);
      return {
        success: true,
        event: eventName,
        timestamp: new Date().toISOString(),
        response: response.data
      };
    } catch (error) {
      logger.error(`Error triggering IFTTT webhook ${eventName}:`, error.message);
      return {
        success: false,
        event: eventName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Batch trigger multiple webhooks
   */
  async batchTrigger(webhooks) {
    try {
      logger.info(`Batch triggering ${webhooks.length} IFTTT webhooks`);
      
      const results = await Promise.all(
        webhooks.map(w => this._triggerWebhook(w.event, w.values))
      );
      
      const successful = results.filter(r => r.success).length;
      logger.info(`Batch trigger completed: ${successful}/${webhooks.length} successful`);
      
      return {
        total: webhooks.length,
        successful,
        results
      };
    } catch (error) {
      logger.error('Error in batch webhook trigger:', error);
      throw error;
    }
  }

  /**
   * Create automated daily report
   */
  async createDailyReport(fitnessData, insights) {
    const webhooks = [
      {
        event: 'daily_insights',
        values: {
          value1: fitnessData.date,
          value2: `Steps: ${fitnessData.activity.steps} | Sleep: ${fitnessData.sleep.duration}h`,
          value3: insights.substring(0, 255)
        }
      }
    ];

    if (fitnessData.activity.steps >= fitnessData.profile.goal.dailySteps) {
      webhooks.push({
        event: 'step_goal_achieved',
        values: {
          value1: fitnessData.activity.steps,
          value2: fitnessData.date,
          value3: 'Great work!'
        }
      });
    }

    if (fitnessData.sleep.duration >= 8) {
      webhooks.push({
        event: 'sleep_goal_achieved',
        values: {
          value1: `${fitnessData.sleep.duration} hours`,
          value2: fitnessData.date,
          value3: `Quality: ${fitnessData.summary.sleepQuality}%`
        }
      });
    }

    webhooks.push({
      event: 'log_activity_sheets',
      values: {
        value1: fitnessData.date,
        value2: JSON.stringify({
          steps: fitnessData.activity.steps,
          calories: fitnessData.activity.calories,
          sleep: fitnessData.sleep.duration,
          hr: fitnessData.heartRate
        }),
        value3: 'Auto-logged'
      }
    });

    return this.batchTrigger(webhooks);
  }

  /**
   * Test webhook connection
   */
  async testConnection() {
    try {
      logger.info('Testing IFTTT webhook connection...');
      
      const testEvent = 'test_connection';
      const url = `${this.baseURL}/${testEvent}/with/key/${this.webhookKey}`;
      
      const response = await axios.post(url, {
        value1: 'Test message',
        value2: new Date().toISOString(),
        value3: 'Connection test'
      });
      
      logger.info('IFTTT connection test successful');
      return {
        success: true,
        message: 'IFTTT webhook connection is working'
      };
    } catch (error) {
      logger.error('IFTTT connection test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new IFTTTHandler();
