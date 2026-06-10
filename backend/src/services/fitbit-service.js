/**
 * Fitbit Service
 * Handles all Fitbit API interactions including OAuth and data fetching
 */

const axios = require('axios');
const logger = require('../utils/logger');

class FitbitService {
  constructor() {
    this.baseURL = process.env.FITBIT_API_BASE_URL || 'https://api.fitbit.com/1';
    this.clientId = process.env.FITBIT_CLIENT_ID;
    this.clientSecret = process.env.FITBIT_CLIENT_SECRET;
  }

  /**
   * Get OAuth 2.0 authorization URL
   */
  getAuthorizationURL(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: [
        'activity',
        'heartrate',
        'location',
        'nutrition',
        'profile',
        'settings',
        'sleep',
        'social',
        'weight'
      ].join(' '),
      redirect_uri: process.env.FITBIT_REDIRECT_URI,
      state: state
    });

    return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(
        'https://api.fitbit.com/oauth2/token',
        {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.FITBIT_REDIRECT_URI
        },
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret
          }
        }
      );

      logger.info('Successfully exchanged authorization code for tokens');
      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        user_id: response.data.user_id
      };
    } catch (error) {
      logger.error('Error exchanging authorization code:', error);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(
        'https://api.fitbit.com/oauth2/token',
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        },
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret
          }
        }
      );

      logger.info('Successfully refreshed access token');
      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken) {
    try {
      const response = await this._makeRequest(accessToken, 'GET', '/user/-/profile.json');
      return response.data.user;
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Get activity data for a specific date
   */
  async getActivityData(accessToken, date) {
    try {
      const response = await this._makeRequest(
        accessToken,
        'GET',
        `/user/-/activities/date/${date}.json`
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching activity data for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get daily activity summary
   */
  async getDailySummary(accessToken, date) {
    try {
      const data = await this.getActivityData(accessToken, date);
      return {
        date: date,
        steps: data.summary?.steps || 0,
        calories: data.summary?.caloriesBurned || 0,
        activeMinutes: data.summary?.fairlyActiveMinutes || 0,
        distance: data.summary?.distances?.[0]?.distance || 0,
        elevation: data.summary?.elevation || 0
      };
    } catch (error) {
      logger.error(`Error fetching daily summary for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get heart rate data for a specific date
   */
  async getHeartRateData(accessToken, date) {
    try {
      const response = await this._makeRequest(
        accessToken,
        'GET',
        `/user/-/activities/heart/date/${date}/1d.json`
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching heart rate data for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get sleep data for a specific date
   */
  async getSleepData(accessToken, date) {
    try {
      const response = await this._makeRequest(
        accessToken,
        'GET',
        `/user/-/sleep/date/${date}.json`
      );
      
      const sleep = response.data.sleep?.[0];
      return {
        date: date,
        duration: sleep?.duration ? sleep.duration / 60000 : 0, // Convert to hours
        startTime: sleep?.startTime || null,
        endTime: sleep?.endTime || null,
        efficiency: sleep?.efficiency || 0,
        stages: sleep?.levels?.summary || {}
      };
    } catch (error) {
      logger.error(`Error fetching sleep data for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get weight data for a specific date
   */
  async getWeightData(accessToken, date) {
    try {
      const response = await this._makeRequest(
        accessToken,
        'GET',
        `/user/-/body/weight/date/${date}.json`
      );
      
      const weight = response.data.weight?.[0];
      return {
        date: date,
        weight: weight?.weight || 0,
        bmi: weight?.bmi || 0,
        fat: weight?.fat || null,
        logId: weight?.logId || null
      };
    } catch (error) {
      logger.error(`Error fetching weight data for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive daily health data
   */
  async getComprehensiveDailyData(accessToken, date) {
    try {
      const [activity, heartRate, sleep, weight, profile] = await Promise.all([
        this.getDailySummary(accessToken, date),
        this.getHeartRateData(accessToken, date),
        this.getSleepData(accessToken, date),
        this.getWeightData(accessToken, date),
        this.getUserProfile(accessToken)
      ]);

      return {
        date,
        profile: {
          name: profile.displayName,
          goal: {
            dailySteps: profile.dailyStepGoal,
            weeklyCaloricDeficit: profile.goalBmiGoal
          }
        },
        activity,
        heartRate,
        sleep,
        weight,
        summary: {
          stepsGoalMet: activity.steps >= profile.dailyStepGoal,
          sleepQuality: this._calculateSleepQuality(sleep),
          caloriesBurned: activity.calories,
          activeMinutes: activity.activeMinutes
        }
      };
    } catch (error) {
      logger.error(`Error fetching comprehensive daily data for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Calculate sleep quality score (0-100)
   */
  _calculateSleepQuality(sleepData) {
    if (!sleepData || sleepData.duration === 0) return 0;
    
    const durationScore = Math.min((sleepData.duration / 8) * 40, 40);
    const efficiencyScore = (sleepData.efficiency / 100) * 60;
    
    return Math.round(durationScore + efficiencyScore);
  }

  /**
   * Make authenticated request to Fitbit API
   */
  async _makeRequest(accessToken, method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        logger.error('Fitbit API: Unauthorized - Token may be expired');
        throw new Error('Fitbit authentication failed - token expired');
      }
      throw error;
    }
  }
}

module.exports = new FitbitService();
