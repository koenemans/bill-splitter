/* global crypto */
/**
 * Structured logger for Cloudflare Workers
 * Outputs JSON logs that are captured by Cloudflare's logging system
 * and displayed in the Workers dashboard (Workers > Logs)
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Create a structured log entry
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Additional structured data
 * @returns {Object} Structured log object
 */
function createLogEntry(level, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
}

/**
 * Logger class for structured logging in Cloudflare Workers
 */
export class Logger {
  constructor(options = {}) {
    this.minLevel = LOG_LEVELS[options.minLevel] ?? LOG_LEVELS.debug;
    this.defaultContext = options.context || {};
  }

  /**
   * Create a child logger with additional context
   * @param {Object} context - Additional context to include in all logs
   * @returns {Logger} New logger instance with merged context
   */
  child(context) {
    return new Logger({
      minLevel: Object.keys(LOG_LEVELS).find(
        key => LOG_LEVELS[key] === this.minLevel
      ),
      context: { ...this.defaultContext, ...context },
    });
  }

  /**
   * Log at debug level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  debug(message, data = {}) {
    this._log('debug', message, data);
  }

  /**
   * Log at info level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  info(message, data = {}) {
    this._log('info', message, data);
  }

  /**
   * Log at warn level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  warn(message, data = {}) {
    this._log('warn', message, data);
  }

  /**
   * Log at error level
   * @param {string} message - Log message
   * @param {Object} data - Additional data (can include error object)
   */
  error(message, data = {}) {
    this._log('error', message, data);
  }

  /**
   * Internal logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  _log(level, message, data = {}) {
    if (LOG_LEVELS[level] < this.minLevel) {
      return;
    }

    const entry = createLogEntry(level, message, {
      ...this.defaultContext,
      ...data,
    });

    // Format error objects for better visibility in Cloudflare dashboard
    if (data.error instanceof Error) {
      entry.error = {
        name: data.error.name,
        message: data.error.message,
        stack: data.error.stack,
      };
    }

    // Use appropriate console method for Cloudflare to categorize logs
    const logString = JSON.stringify(entry);
    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(logString);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(logString);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(logString);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(logString);
        break;
    }
  }
}

/**
 * Create a request-scoped logger with request context
 * @param {Object} c - Hono context
 * @returns {Logger} Logger with request context
 */
export function createRequestLogger(c) {
  const requestId =
    c.req.header('cf-ray') ||
    c.req.header('x-request-id') ||
    crypto.randomUUID();

  return new Logger({
    context: {
      requestId,
      method: c.req.method,
      path: c.req.path,
      cf: c.req.raw?.cf
        ? {
            colo: c.req.raw.cf.colo,
            country: c.req.raw.cf.country,
            city: c.req.raw.cf.city,
          }
        : undefined,
    },
  });
}

// Default logger instance
export const logger = new Logger();
