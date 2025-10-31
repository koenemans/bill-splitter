import winston from 'winston';
import {
  anonymizeExpenseDescription,
  anonymizeIpAddress,
  anonymizeParticipantName,
  anonymizeQueryParams,
  anonymizeUserAgent,
} from './anonymizer.js';

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    };

    // Add correlation ID if available
    if (meta.correlationId) {
      logEntry.correlationId = meta.correlationId;
    }

    return JSON.stringify(logEntry);
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'bill-splitter-server',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// File transport for production logging
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    })
  );
}

// Enhanced logging methods with context
const createContextualLogger = (context = {}) => {
  return {
    debug: (message, meta = {}) =>
      logger.debug(message, { ...context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    error: (message, meta = {}) =>
      logger.error(message, { ...context, ...meta }),

    // Business logic specific methods
    splitCreated: (splitId, meta = {}) => {
      logger.info('Split created', {
        ...context,
        ...meta,
        splitId,
        event: 'split_created',
      });
    },

    participantAdded: (splitId, participantName, meta = {}) => {
      logger.info('Participant added', {
        ...context,
        ...meta,
        splitId,
        participantName: anonymizeParticipantName(participantName),
        event: 'participant_added',
      });
    },

    expenseAdded: (splitId, amount, description, meta = {}) => {
      logger.info('Expense added', {
        ...context,
        ...meta,
        splitId,
        amount,
        description: anonymizeExpenseDescription(description),
        event: 'expense_added',
      });
    },

    splitCompleted: (splitId, participantCount, totalAmount, meta = {}) => {
      logger.info('Split completed', {
        ...context,
        ...meta,
        splitId,
        participantCount,
        totalAmount,
        event: 'split_completed',
      });
    },

    memoryAlert: (memoryUsage, threshold, activeSplits, meta = {}) => {
      logger.warn('High memory usage detected', {
        ...context,
        ...meta,
        memoryUsage,
        threshold,
        activeSplits,
        event: 'memory_alert',
      });
    },

    performanceMetric: (operation, duration, meta = {}) => {
      logger.info('Performance metric', {
        ...context,
        ...meta,
        operation,
        duration,
        event: 'performance_metric',
      });
    },
  };
};

// Request correlation middleware
const correlationMiddleware = (req, res, next) => {
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Add correlation context to logger with anonymized data
  req.logger = createContextualLogger({
    correlationId,
    userAgent: anonymizeUserAgent(req.headers['user-agent']),
    ip: anonymizeIpAddress(req.ip || req.connection.remoteAddress),
  });

  next();
};

// Request logging middleware
const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request with anonymized query parameters
  req.logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    query: anonymizeQueryParams(req.query),
    event: 'request_start',
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    req.logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      event: 'request_end',
    });

    // Log performance metrics
    req.logger.performanceMetric(
      `${req.method} ${req.route?.path || req.url}`,
      duration,
      {
        statusCode: res.statusCode,
        success: res.statusCode < 400,
      }
    );

    originalEnd.apply(this, args);
  };

  next();
};

// Error logging middleware
const errorLoggingMiddleware = (error, req, res, next) => {
  const logger = req.logger || createContextualLogger();

  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    statusCode: error.status || 500,
    event: 'error',
  });

  next(error);
};

// System metrics logging
const logSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  const systemLogger = createContextualLogger({ component: 'system' });

  systemLogger.info('System metrics', {
    memory: {
      heapUsed: memUsageMB,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
    uptime: process.uptime(),
    event: 'system_metrics',
  });
};

export {
  logger,
  createContextualLogger,
  correlationMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  logSystemMetrics,
};
