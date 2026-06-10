/**
 * Google Health Service
  * Handles all Google Health API interactions including OAuth and body measurements fetching
   */

const axios = require('axios');
const logger = require('../utils/logger');

class GoogleHealthService {
    constructor() {
          this.baseURL = 'https://www.googleapis.com/health/v1';
          this.clientId = process.env.GOOGLE_CLIENT_ID;
          this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
        }

    /**
       * Get OAuth 2.0 authorization URL
          */
    getAuthorizationURL(state) {
          const params = new URLSearchParams({
                  client_id: this.clientId,
                  response_type: 'code',
                  scope: [
                            'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
                            'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly'
                          ].join(' '),
                  redirect_uri: this.redirectUri,
                  state: state,
                  access_type: 'offline',
                  prompt: 'consent'
                });

          return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        }

    /**
       * Exchange authorization code for access and refresh tokens
          */
    async exchangeCodeForToken(code) {
          try {
                  const response = await axios.post(
                            'https://oauth2.googleapis.com/token',
                            {
                                        grant_type: 'authorization_code',
                                        code: code,
                                        redirect_uri: this.redirectUri,
                                        client_id: this.clientId,
                                        client_secret: this.clientSecret
                                      }
                          );

                  logger.info('Successfully exchanged code for Google tokens');
                  return response.data;
                } catch (error) {
                  logger.error('Error exchanging code for token:', error.response?.data || error.message);
                  throw error;
                }
        }

    /**
       * Refresh access token using refresh token
          */
    async refreshAccessToken(refreshToken) {
          try {
                  const response = await axios.post(
                            'https://oauth2.googleapis.com/token',
                            {
                                        grant_type: 'refresh_token',
                                        refresh_token: refreshToken,
                                        client_id: this.clientId,
                                        client_secret: this.clientSecret
                                      }
                          );

                  logger.info('Successfully refreshed Google access token');
                  return response.data;
                } catch (error) {
                  logger.error('Error refreshing token:', error.response?.data || error.message);
                  throw error;
                }
        }

    /**
       * Get body measurements (weight, height, BMI, body fat)
          */
    async getBodyMeasurements(accessToken, startTime, endTime) {
          try {
                  const response = await axios.get(
                            `${this.baseURL}/wellness/read`,
                            {
                                        headers: {
                                                      'Authorization': `Bearer ${accessToken}`
                                                    },
                                        params: {
                                                      dataTypes: [
                                                                      'com.google.body_measurements.body_mass_index',
                                                                      'com.google.body_measurements.height',
                                                                      'com.google.body_measurements.weight',
                                                                      'com.google.body_measurements.body_fat_percentage'
                                                                    ].join(','),
                                                      startTimeMillis: new Date(startTime).getTime(),
                                                      endTimeMillis: new Date(endTime).getTime()
                                                    }
                                      }
                          );

                  logger.info('Successfully fetched body measurements from Google Health');
                  return response.data;
                } catch (error) {
                  logger.error('Error fetching body measurements:', error.response?.data || error.message);
                  throw error;
                }
        }

    /**
       * Get activity and fitness data (steps, calories, etc.)
          */
    async getActivityData(accessToken, startTime, endTime) {
          try {
                  const response = await axios.get(
                            `${this.baseURL}/wellness/read`,
                            {
                                        headers: {
                                                      'Authorization': `Bearer ${accessToken}`
                                                    },
                                        params: {
                                                      dataTypes: [
                                                                      'com.google.step_count.delta',
                                                                      'com.google.calories.expended',
                                                                      'com.google.activity.fitness.activity'
                                                                    ].join(','),
                                                      startTimeMillis: new Date(startTime).getTime(),
                                                      endTimeMillis: new Date(endTime).getTime()
                                                    }
                                      }
                          );

                  logger.info('Successfully fetched activity data from Google Health');
                  return response.data;
                } catch (error) {
                  logger.error('Error fetching activity data:', error.response?.data || error.message);
                  throw error;
                }
        }

    /**
       * Get all health data
          */
    async getAllHealthData(accessToken, startTime, endTime) {
          try {
                  const [bodyData, activityData] = await Promise.all([
                            this.getBodyMeasurements(accessToken, startTime, endTime),
                            this.getActivityData(accessToken, startTime, endTime)
                          ]);

                  return {
                            bodyMeasurements: bodyData,
                            activityData: activityData,
                            lastUpdated: new Date().toISOString()
                          };
                } catch (error) {
                  logger.error('Error fetching all health data:', error.message);
                  throw error;
                }
        }
  }

module.exports = new GoogleHealthService();
