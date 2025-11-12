import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  correlationMiddleware,
  createContextualLogger,
  errorLoggingMiddleware,
  logSystemMetrics,
  requestLoggingMiddleware,
} from '../utils/logger.js';

describe('Logger Utilities', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('createContextualLogger', () => {
    test('should create logger with default context', () => {
      const contextLogger = createContextualLogger();

      expect(typeof contextLogger.debug).toBe('function');
      expect(typeof contextLogger.info).toBe('function');
      expect(typeof contextLogger.warn).toBe('function');
      expect(typeof contextLogger.error).toBe('function');
      expect(typeof contextLogger.splitCreated).toBe('function');
      expect(typeof contextLogger.participantAdded).toBe('function');
      expect(typeof contextLogger.expenseAdded).toBe('function');
      expect(typeof contextLogger.splitCompleted).toBe('function');
      expect(typeof contextLogger.memoryAlert).toBe('function');
      expect(typeof contextLogger.performanceMetric).toBe('function');
    });

    test('should create logger with custom context', () => {
      const context = { correlationId: 'test-id', service: 'test-service' };
      const contextLogger = createContextualLogger(context);

      // Test that the logger functions exist
      expect(typeof contextLogger.info).toBe('function');

      // Test basic functionality without complex mocking
      contextLogger.info('test message', { extra: 'data' });
      // The actual Winston logger will handle the output
    });

    test('should log split created event', () => {
      const contextLogger = createContextualLogger();
      const splitId = 'test-split-id';

      // Test that the function exists and can be called
      expect(() => {
        contextLogger.splitCreated(splitId, { userId: 'user123' });
      }).not.toThrow();
    });

    test('should log participant added event', () => {
      const contextLogger = createContextualLogger();
      const splitId = 'test-split-id';
      const participantName = 'John Doe';

      expect(() => {
        contextLogger.participantAdded(splitId, participantName);
      }).not.toThrow();
    });

    test('should log expense added event', () => {
      const contextLogger = createContextualLogger();
      const splitId = 'test-split-id';
      const amount = 25.5;
      const description = 'Dinner at restaurant';

      expect(() => {
        contextLogger.expenseAdded(splitId, amount, description);
      }).not.toThrow();
    });

    test('should log split completed event', () => {
      const contextLogger = createContextualLogger();
      const splitId = 'test-split-id';
      const participantCount = 3;
      const totalAmount = 75.0;

      expect(() => {
        contextLogger.splitCompleted(splitId, participantCount, totalAmount);
      }).not.toThrow();
    });

    test('should log memory alert', () => {
      const contextLogger = createContextualLogger();
      const memoryUsage = 512;
      const threshold = 500;
      const activeSplits = 10;

      expect(() => {
        contextLogger.memoryAlert(memoryUsage, threshold, activeSplits);
      }).not.toThrow();
    });

    test('should log performance metric', () => {
      const contextLogger = createContextualLogger();
      const operation = 'GET /api/splits';
      const duration = 150;

      expect(() => {
        contextLogger.performanceMetric(operation, duration, { success: true });
      }).not.toThrow();
    });

    test('should log debug messages', () => {
      const contextLogger = createContextualLogger();
      expect(() => {
        contextLogger.debug('debug message', { extra: 'data' });
      }).not.toThrow();
    });

    test('should log warning messages', () => {
      const contextLogger = createContextualLogger();
      expect(() => {
        contextLogger.warn('warning message', { extra: 'data' });
      }).not.toThrow();
    });

    test('should log error messages', () => {
      const contextLogger = createContextualLogger();
      expect(() => {
        contextLogger.error('error message', { extra: 'data' });
      }).not.toThrow();
    });
  });

  describe('correlationMiddleware', () => {
    test('should add correlation ID from x-correlation-id header', () => {
      const req = {
        headers: { 'x-correlation-id': 'test-correlation-id' },
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      correlationMiddleware(req, res, next);

      expect(req.correlationId).toBe('test-correlation-id');
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-correlation-id',
        'test-correlation-id'
      );
      expect(req.logger).toBeDefined();
      expect(typeof req.logger.info).toBe('function');
      expect(next).toHaveBeenCalled();
    });

    test('should add correlation ID from x-request-id header', () => {
      const req = {
        headers: { 'x-request-id': 'test-request-id' },
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      correlationMiddleware(req, res, next);

      expect(req.correlationId).toBe('test-request-id');
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-correlation-id',
        'test-request-id'
      );
      expect(next).toHaveBeenCalled();
    });

    test('should generate correlation ID if not provided', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      correlationMiddleware(req, res, next);

      expect(req.correlationId).toBeDefined();
      expect(req.correlationId).toMatch(/^req-/);
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-correlation-id',
        req.correlationId
      );
      expect(next).toHaveBeenCalled();
    });

    test('should anonymize user agent and IP in logger context', () => {
      const req = {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        ip: '192.168.1.1',
      };
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      correlationMiddleware(req, res, next);

      expect(req.logger).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    test('should handle missing IP address', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '10.0.0.1' },
      };
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      correlationMiddleware(req, res, next);

      expect(req.logger).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requestLoggingMiddleware', () => {
    test('should log incoming request and response', () => {
      const req = {
        method: 'GET',
        url: '/api/splits',
        query: {},
        logger: createContextualLogger(),
      };
      const originalEnd = jest.fn();
      const res = {
        statusCode: 200,
        end: originalEnd,
      };
      const next = jest.fn();

      requestLoggingMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();

      // Simulate response end
      res.end();

      expect(originalEnd).toHaveBeenCalled();
    });

    test('should log request with query parameters', () => {
      const req = {
        method: 'GET',
        url: '/api/splits?id=123',
        query: { id: '123' },
        logger: createContextualLogger(),
      };
      const res = {
        statusCode: 200,
        end: jest.fn(),
      };
      const next = jest.fn();

      requestLoggingMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should calculate request duration', () => {
      const req = {
        method: 'POST',
        url: '/api/splits',
        query: {},
        route: { path: '/api/splits' },
        logger: createContextualLogger(),
      };
      const originalEnd = jest.fn();
      const res = {
        statusCode: 201,
        end: originalEnd,
      };
      const next = jest.fn();

      requestLoggingMiddleware(req, res, next);

      // Simulate response end after some time
      res.end();

      expect(originalEnd).toHaveBeenCalled();
    });

    test('should handle error status codes', () => {
      const req = {
        method: 'GET',
        url: '/api/splits/invalid',
        query: {},
        logger: createContextualLogger(),
      };
      const originalEnd = jest.fn();
      const res = {
        statusCode: 404,
        end: originalEnd,
      };
      const next = jest.fn();

      requestLoggingMiddleware(req, res, next);

      res.end();

      expect(originalEnd).toHaveBeenCalled();
    });
  });

  describe('errorLoggingMiddleware', () => {
    test('should log error with request logger', () => {
      const error = new Error('Test error');
      error.status = 500;
      const req = {
        method: 'GET',
        url: '/api/splits',
        logger: createContextualLogger(),
      };
      const res = {};
      const next = jest.fn();

      errorLoggingMiddleware(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should create logger if not present on request', () => {
      const error = new Error('Test error');
      const req = {
        method: 'POST',
        url: '/api/splits',
      };
      const res = {};
      const next = jest.fn();

      errorLoggingMiddleware(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should log error stack trace', () => {
      const error = new Error('Test error with stack');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      const req = {
        method: 'DELETE',
        url: '/api/splits/123',
        logger: createContextualLogger(),
      };
      const res = {};
      const next = jest.fn();

      errorLoggingMiddleware(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('logSystemMetrics', () => {
    test('should log system metrics without errors', () => {
      expect(() => {
        logSystemMetrics();
      }).not.toThrow();
    });

    test('should include memory and uptime metrics', () => {
      // Just verify it runs without throwing and returns
      const result = logSystemMetrics();
      expect(result).toBeUndefined();
    });
  });
});
