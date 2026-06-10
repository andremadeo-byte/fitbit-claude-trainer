/**
 * Logger Utility
 * Provides structured logging for the application
 */

const pino = require('pino');
const path = require('path');

const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: logLevel,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime
});

// Add context methods
logger.withContext = (context) => {
  return logger.child(context);
};

module.exports = logger;
