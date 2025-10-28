import winston from 'winston';
import appInsights from 'applicationinsights';

// Initialize Application Insights if connection string is provided
const initializeAppInsights = () => {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (connectionString) {
    appInsights
      .setup(connectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(true)
      .start();

    return appInsights.defaultClient;
  }
  return null;
};

const appInsightsClient = initializeAppInsights();

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

// Add Application Insights transport if available
if (appInsightsClient) {
  try {
    const { AzureApplicationInsightsLogger } = await import(
      'winston-azure-application-insights'
    );
    logger.add(
      new AzureApplicationInsightsLogger({
        client: appInsightsClient,
        level: 'info',
      })
    );
  } catch (error) {
    console.warn(
      'Failed to initialize Application Insights transport:',
      error.message
    );
  }
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
        participantName,
        event: 'participant_added',
      });
    },

    expenseAdded: (splitId, amount, description, meta = {}) => {
      logger.info('Expense added', {
        ...context,
        ...meta,
        splitId,
        amount,
        description,
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

  // Add correlation context to logger
  req.logger = createContextualLogger({
    correlationId,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  });

  next();
};

// Request logging middleware
const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  req.logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    query: req.query,
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

    // Track performance metrics
    if (appInsightsClient) {
      appInsightsClient.trackRequest({
        name: `${req.method} ${req.route?.path || req.url}`,
        url: req.url,
        duration,
        resultCode: res.statusCode,
        success: res.statusCode < 400,
        properties: {
          correlationId: req.correlationId,
          userAgent: req.headers['user-agent'],
        },
      });
    }

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

  // Track exception in Application Insights
  if (appInsightsClient) {
    appInsightsClient.trackException({
      exception: error,
      properties: {
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
      },
    });
  }

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

  // Track custom metrics in Application Insights
  if (appInsightsClient) {
    appInsightsClient.trackMetric({
      name: 'Memory Usage (MB)',
      value: memUsageMB,
    });

    appInsightsClient.trackMetric({
      name: 'Uptime (seconds)',
      value: process.uptime(),
    });
  }
};

export {
  logger,
  createContextualLogger,
  correlationMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  logSystemMetrics,
  appInsightsClient,
};
