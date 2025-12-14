/**
 * Request logging middleware for Cloudflare Workers
 * Logs request/response details in structured format for Cloudflare dashboard
 */
import { createRequestLogger } from '../utils/logger.js';

/**
 * Middleware that logs incoming requests and outgoing responses
 * Attaches a request-scoped logger to the context for use in route handlers
 */
export async function requestLogger(c, next) {
  const startTime = Date.now();
  const log = createRequestLogger(c);

  // Attach logger to context for use in route handlers
  c.set('logger', log);

  log.info('Request received', {
    url: c.req.url,
    userAgent: c.req.header('user-agent'),
    ip:
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
  });

  try {
    await next();

    const duration = Date.now() - startTime;
    const status = c.res.status;

    const logData = {
      status,
      duration,
      durationMs: duration,
    };

    if (status >= 500) {
      log.error('Request completed with server error', logData);
    } else if (status >= 400) {
      log.warn('Request completed with client error', logData);
    } else {
      log.info('Request completed', logData);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    log.error('Request failed with exception', {
      error,
      duration,
      durationMs: duration,
    });

    throw error;
  }
}

/**
 * Get logger from Hono context
 * @param {Object} c - Hono context
 * @returns {Logger} Request-scoped logger
 */
export function getLogger(c) {
  return c.get('logger');
}
