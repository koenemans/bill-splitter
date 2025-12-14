import { getLogger } from './requestLogger.js';
import { logger as defaultLogger } from '../utils/logger.js';

/**
 * Centralized error handler for Hono
 */
export function errorHandler(err, c) {
  // Use request-scoped logger if available, otherwise fall back to default
  const log = getLogger(c) || defaultLogger;

  log.error('Unhandled error', {
    error: err,
    errorType: err.name,
    errorMessage: err.message,
  });

  const isProduction = c.env?.ENVIRONMENT === 'production';

  // Don't expose internal error details in production
  const message = isProduction ? 'Internal server error' : err.message;

  return c.json(
    {
      error: message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
    err.status || 500
  );
}
