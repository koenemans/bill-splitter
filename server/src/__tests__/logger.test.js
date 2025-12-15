import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { createRequestLogger, Logger } from '../utils/logger.js';

describe('Logger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log levels', () => {
    test('should log debug messages', () => {
      const logger = new Logger();
      logger.debug('debug message', { key: 'value' });

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleSpy.debug.mock.calls[0][0]);
      expect(logOutput.level).toBe('debug');
      expect(logOutput.message).toBe('debug message');
      expect(logOutput.key).toBe('value');
      expect(logOutput.timestamp).toBeDefined();
    });

    test('should log info messages', () => {
      const logger = new Logger();
      logger.info('info message');

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
      expect(logOutput.level).toBe('info');
      expect(logOutput.message).toBe('info message');
    });

    test('should log warn messages', () => {
      const logger = new Logger();
      logger.warn('warn message');

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleSpy.warn.mock.calls[0][0]);
      expect(logOutput.level).toBe('warn');
      expect(logOutput.message).toBe('warn message');
    });

    test('should log error messages', () => {
      const logger = new Logger();
      logger.error('error message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(logOutput.level).toBe('error');
      expect(logOutput.message).toBe('error message');
    });
  });

  describe('minimum log level', () => {
    test('should respect minimum log level', () => {
      const logger = new Logger({ minLevel: 'warn' });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('child logger', () => {
    test('should create child logger with merged context', () => {
      const logger = new Logger({ context: { service: 'api' } });
      const childLogger = logger.child({ requestId: '123' });

      childLogger.info('test');

      const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
      expect(logOutput.service).toBe('api');
      expect(logOutput.requestId).toBe('123');
    });

    test('should inherit minimum log level from parent', () => {
      const logger = new Logger({ minLevel: 'error' });
      const childLogger = logger.child({ requestId: '123' });

      childLogger.warn('warn');
      childLogger.error('error');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('error formatting', () => {
    test('should format Error objects', () => {
      const logger = new Logger();
      const testError = new Error('Test error');
      testError.name = 'TestError';

      logger.error('Something went wrong', { error: testError });

      const logOutput = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(logOutput.error.name).toBe('TestError');
      expect(logOutput.error.message).toBe('Test error');
      expect(logOutput.error.stack).toBeDefined();
    });
  });

  describe('default context', () => {
    test('should include default context in all logs', () => {
      const logger = new Logger({ context: { environment: 'test' } });

      logger.info('test message', { extra: 'data' });

      const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
      expect(logOutput.environment).toBe('test');
      expect(logOutput.extra).toBe('data');
    });
  });
});

describe('createRequestLogger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should create logger with request context', () => {
    const mockContext = {
      req: {
        method: 'GET',
        path: '/api/test',
        header: jest.fn(name => {
          if (name === 'cf-ray') {
            return 'test-ray-id';
          }
          return null;
        }),
        raw: {
          cf: {
            colo: 'AMS',
            country: 'NL',
            city: 'Amsterdam',
          },
        },
      },
    };

    const logger = createRequestLogger(mockContext);
    logger.info('test');

    const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(logOutput.requestId).toBe('test-ray-id');
    expect(logOutput.method).toBe('GET');
    expect(logOutput.path).toBe('/api/test');
    expect(logOutput.cf.colo).toBe('AMS');
    expect(logOutput.cf.country).toBe('NL');
  });

  test('should fallback to x-request-id header', () => {
    const mockContext = {
      req: {
        method: 'POST',
        path: '/api/test',
        header: jest.fn(name => {
          if (name === 'x-request-id') {
            return 'custom-request-id';
          }
          return null;
        }),
        raw: {},
      },
    };

    const logger = createRequestLogger(mockContext);
    logger.info('test');

    const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(logOutput.requestId).toBe('custom-request-id');
  });

  test('should generate UUID if no request ID header present', () => {
    const mockContext = {
      req: {
        method: 'GET',
        path: '/api/test',
        header: jest.fn(() => null),
        raw: {},
      },
    };

    const logger = createRequestLogger(mockContext);
    logger.info('test');

    const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(logOutput.requestId).toBeDefined();
    expect(logOutput.requestId.length).toBeGreaterThan(0);
  });

  test('should handle missing cf data gracefully', () => {
    const mockContext = {
      req: {
        method: 'GET',
        path: '/api/test',
        header: jest.fn(() => {
          return 'test-id';
        }),
        raw: null,
      },
    };

    const logger = createRequestLogger(mockContext);
    logger.info('test');

    const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(logOutput.cf).toBeUndefined();
  });
});
