import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

// Initialize Application Insights
let appInsights = null;
let reactPlugin = null;

const initializeAppInsights = () => {
  const connectionString = import.meta?.env
    ?.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (connectionString) {
    reactPlugin = new ReactPlugin();

    appInsights = new ApplicationInsights({
      config: {
        connectionString,
        extensions: [reactPlugin],
        extensionConfig: {
          [reactPlugin.identifier]: {
            history: null, // Will be set when router is available
          },
        },
        enableAutoRouteTracking: true,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        enableAjaxErrorStatusText: true,
        enableAjaxPerfTracking: true,
        enableUnhandledPromiseRejectionTracking: true,
        disableFetchTracking: false,
        enableDebugExceptions: import.meta?.env?.DEV,
      },
    });

    appInsights.loadAppInsights();

    // Set user context
    appInsights.setAuthenticatedUserContext(
      `user-${Date.now()}`, // Anonymous user ID
      null,
      true
    );
  }

  return { appInsights, reactPlugin };
};

const { appInsights: ai, reactPlugin: rp } = initializeAppInsights();

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

  // Application Insights logging
  if (ai) {
    const severity =
      level === LogLevel.ERROR
        ? 3
        : level === LogLevel.WARN
          ? 2
          : level === LogLevel.DEBUG
            ? 0
            : 1;

    ai.trackTrace({
      message,
      severityLevel: severity,
      properties: {
        ...meta,
        service: 'bill-splitter-client',
        environment: import.meta?.env?.MODE,
      },
    });
  }
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

    if (ai) {
      ai.trackEvent({
        name: 'Split Created',
        properties: { splitId, ...meta },
      });
    }
  },

  participantAdded: (splitId, participantName, meta = {}) => {
    logger.info('Participant added', {
      splitId,
      participantName,
      event: 'participant_added',
      ...meta,
    });

    if (ai) {
      ai.trackEvent({
        name: 'Participant Added',
        properties: { splitId, participantName, ...meta },
      });
    }
  },

  expenseAdded: (splitId, amount, description, meta = {}) => {
    logger.info('Expense added', {
      splitId,
      amount,
      description,
      event: 'expense_added',
      ...meta,
    });

    if (ai) {
      ai.trackEvent({
        name: 'Expense Added',
        properties: { splitId, amount, description, ...meta },
        measurements: { amount: parseFloat(amount) },
      });
    }
  },

  splitCompleted: (splitId, participantCount, totalAmount, meta = {}) => {
    logger.info('Split completed', {
      splitId,
      participantCount,
      totalAmount,
      event: 'split_completed',
      ...meta,
    });

    if (ai) {
      ai.trackEvent({
        name: 'Split Completed',
        properties: { splitId, ...meta },
        measurements: {
          participantCount,
          totalAmount: parseFloat(totalAmount),
        },
      });
    }
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

    if (ai) {
      ai.trackException({
        exception: error instanceof Error ? error : new Error(errorMessage),
        properties: errorMeta,
      });
    }
  },

  pageView: (pageName, url, meta = {}) => {
    logger.info(`Page view: ${pageName}`, {
      page: pageName,
      url,
      event: 'page_view',
      ...meta,
    });

    if (ai) {
      ai.trackPageView({
        name: pageName,
        uri: url,
        properties: meta,
      });
    }
  },

  userAction: (action, target, meta = {}) => {
    logger.info(`User action: ${action}`, {
      action,
      target,
      event: 'user_action',
      ...meta,
    });

    if (ai) {
      ai.trackEvent({
        name: 'User Action',
        properties: { action, target, ...meta },
      });
    }
  },

  performanceMetric: (name, duration, meta = {}) => {
    logger.info(`Performance: ${name}`, {
      metric: name,
      duration,
      event: 'performance_metric',
      ...meta,
    });

    if (ai) {
      ai.trackMetric({
        name,
        average: duration,
        properties: meta,
      });
    }
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

  if (ai) {
    ai.trackException({
      exception: error,
      properties: {
        componentStack,
        errorBoundary: true,
      },
    });
  }
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

export { ai as appInsights, rp as reactPlugin };
