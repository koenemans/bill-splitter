// Simple client-side logging without external dependencies

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Current log level based on environment
const currentLogLevel = import.meta?.env?.DEV ? LogLevel.DEBUG : LogLevel.INFO;

// Enhanced console logging with structured format
const formatLogMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: Object.keys(LogLevel)[level],
    message,
    service: 'bill-splitter-client',
    environment: import.meta?.env?.MODE,
    ...meta,
  };

  return logEntry;
};

// Core logging function
const log = (level, message, meta = {}) => {
  if (level < currentLogLevel) {
    return;
  }

  const logEntry = formatLogMessage(level, message, meta);
  const consoleMethod =
    level === LogLevel.ERROR
      ? 'error'
      : level === LogLevel.WARN
        ? 'warn'
        : level === LogLevel.DEBUG
          ? 'debug'
          : 'log';

  // Console logging
  console[consoleMethod](
    `[${logEntry.level}] ${logEntry.timestamp} - ${message}`,
    meta
  );
};

// Logger interface
const logger = {
  debug: (message, meta) => log(LogLevel.DEBUG, message, meta),
  info: (message, meta) => log(LogLevel.INFO, message, meta),
  warn: (message, meta) => log(LogLevel.WARN, message, meta),
  error: (message, meta) => log(LogLevel.ERROR, message, meta),

  // Business event tracking
  splitCreated: (splitId, meta = {}) => {
    logger.info('Split created', { splitId, event: 'split_created', ...meta });
  },

  participantAdded: (splitId, participantName, meta = {}) => {
    logger.info('Participant added', {
      splitId,
      participantName,
      event: 'participant_added',
      ...meta,
    });
  },

  expenseAdded: (splitId, amount, description, meta = {}) => {
    logger.info('Expense added', {
      splitId,
      amount,
      description,
      event: 'expense_added',
      ...meta,
    });
  },

  splitCompleted: (splitId, participantCount, totalAmount, meta = {}) => {
    logger.info('Split completed', {
      splitId,
      participantCount,
      totalAmount,
      event: 'split_completed',
      ...meta,
    });
  },

  apiError: (operation, error, meta = {}) => {
    const errorMessage = error?.message || error || 'Unknown error';
    const errorMeta = {
      operation,
      error: errorMessage,
      event: 'api_error',
      ...meta,
    };

    logger.error(`API Error: ${operation}`, errorMeta);
  },

  pageView: (pageName, url, meta = {}) => {
    logger.info(`Page view: ${pageName}`, {
      page: pageName,
      url,
      event: 'page_view',
      ...meta,
    });
  },

  userAction: (action, target, meta = {}) => {
    logger.info(`User action: ${action}`, {
      action,
      target,
      event: 'user_action',
      ...meta,
    });
  },

  performanceMetric: (name, duration, meta = {}) => {
    logger.info(`Performance: ${name}`, {
      metric: name,
      duration,
      event: 'performance_metric',
      ...meta,
    });
  },
};

// Error boundary logging
const logErrorBoundary = (error, errorInfo, componentStack) => {
  logger.error('React Error Boundary', {
    error: error.message,
    stack: error.stack,
    componentStack,
    event: 'error_boundary',
  });
};

// Performance observer for Core Web Vitals
const initializePerformanceTracking = () => {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      logger.performanceMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
      });
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // LCP not supported
    }

    // First Input Delay
    const fidObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        logger.performanceMetric(
          'FID',
          entry.processingStart - entry.startTime,
          {
            eventType: entry.name,
          }
        );
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch {
      // FID not supported
    }

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Report CLS on page unload
      window.addEventListener('beforeunload', () => {
        logger.performanceMetric('CLS', clsValue);
      });
    } catch {
      // CLS not supported
    }
  }
};

// Initialize performance tracking
if (typeof window !== 'undefined') {
  initializePerformanceTracking();
}

export { logger, logErrorBoundary, LogLevel };
