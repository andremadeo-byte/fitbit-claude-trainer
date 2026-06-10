/**
 * Google OAuth Authentication Routes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const googleHealthService = require('../services/google-health-service');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Step 1: Redirect user to Google authorization
 */
router.get('/authorize', (req, res) => {
    const state = uuidv4();
    // Store state in session/cache for verification in callback
    req.session.googleOAuthState = state;

    const authUrl = googleHealthService.getAuthorizationURL(state);
    res.redirect(authUrl);
  });

/**
 * Step 2: Handle Google OAuth callback
 */
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    try {
          // Verify state parameter
          if (state !== req.session.googleOAuthState) {
                  logger.error('State mismatch in Google OAuth callback');
                  return res.status(400).json({ error: 'State mismatch' });
                }

          if (!code) {
                  logger.error('No authorization code received from Google');
                  return res.status(400).json({ error: 'No authorization code received' });
                }

          // Exchange code for tokens
          const tokens = await googleHealthService.exchangeCodeForToken(code);

          // TODO: Store tokens in database associated with user
          // Example:
          // await User.updateOne(
                //   { _id: req.user.id },
                //   {
                      //     googleHealth: {
                            //       accessToken: tokens.access_token,
                            //       refreshToken: tokens.refresh_token,
                            //       expiresAt: new Date(Date.now() + tokens.expires_in * 1000)
                            //     }
                      //   }
                // );

          logger.info('Successfully authenticated with Google Health API');

          // Return tokens to frontend (or redirect with tokens)
          res.json({
                  success: true,
                  message: 'Successfully connected to Google Health',
                  tokens: {
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            expires_in: tokens.expires_in
                          }
                });
        } catch (error) {
          logger.error('OAuth callback error:', error);
          res.status(500).json({ 
                  error: 'Authentication failed',
                  message: error.message 
                });
        }
  });

/**
 * Get body measurements from Google Health
 */
router.post('/health/body-measurements', async (req, res) => {
    try {
          const { accessToken, startTime, endTime } = req.body;

          if (!accessToken) {
                  return res.status(400).json({ error: 'Access token required' });
                }

          const measurements = await googleHealthService.getBodyMeasurements(
                  accessToken,
                  startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                  endTime || new Date()
                );

          res.json(measurements);
        } catch (error) {
          logger.error('Error fetching body measurements:', error);
          res.status(500).json({ error: 'Failed to fetch body measurements' });
        }
  });

/**
 * Get activity data from Google Health
 */
router.post('/health/activity', async (req, res) => {
    try {
          const { accessToken, startTime, endTime } = req.body;

          if (!accessToken) {
                  return res.status(400).json({ error: 'Access token required' });
                }

          const activityData = await googleHealthService.getActivityData(
                  accessToken,
                  startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                  endTime || new Date()
                );

          res.json(activityData);
        } catch (error) {
          logger.error('Error fetching activity data:', error);
          res.status(500).json({ error: 'Failed to fetch activity data' });
        }
  });

module.exports = router;
