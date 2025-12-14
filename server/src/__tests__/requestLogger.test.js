import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { getLogger, requestLogger } from '../middleware/requestLogger.js';

describe('requestLogger middleware', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createMockContext(options = {}) {
    const contextStore = new Map();

    return {
      req: {
        method: options.method || 'GET',
        path: options.path || '/test',
        url: options.url || 'http://localhost/test',
        header: jest.fn(name => {
          if (name === 'cf-ray') {
            return options.cfRay || 'test-ray';
          }
          if (name === 'user-agent') {
            return options.userAgent || 'test-agent';
          }
          if (name === 'cf-connecting-ip') {
            return options.ip || '127.0.0.1';
          }
          return null;
        }),
        raw: {
          cf: options.cf || {
            colo: 'AMS',
            country: 'NL',
            city: 'Amsterdam',
          },
        },
      },
      res: {
        status: options.responseStatus || 200,
      },
      set: (key, value) => contextStore.set(key, value),
      get: key => contextStore.get(key),
    };
  }

  test('should log request received on entry', async () => {
    const c = createMockContext();
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    expect(consoleSpy.info).toHaveBeenCalled();
    const firstCall = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(firstCall.message).toBe('Request received');
    expect(firstCall.method).toBe('GET');
    expect(firstCall.path).toBe('/test');
  });

  test('should log request completion with duration', async () => {
    const c = createMockContext();
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    const lastCall = JSON.parse(
      consoleSpy.info.mock.calls[consoleSpy.info.mock.calls.length - 1][0]
    );
    expect(lastCall.message).toBe('Request completed');
    expect(lastCall.status).toBe(200);
    expect(lastCall.durationMs).toBeDefined();
  });

  test('should attach logger to context', async () => {
    const c = createMockContext();
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    const logger = getLogger(c);
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  test('should log warning for 4xx responses', async () => {
    const c = createMockContext({ responseStatus: 404 });
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    expect(consoleSpy.warn).toHaveBeenCalled();
    const warnCall = JSON.parse(consoleSpy.warn.mock.calls[0][0]);
    expect(warnCall.message).toBe('Request completed with client error');
    expect(warnCall.status).toBe(404);
  });

  test('should log error for 5xx responses', async () => {
    const c = createMockContext({ responseStatus: 500 });
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    expect(consoleSpy.error).toHaveBeenCalled();
    const errorCall = JSON.parse(consoleSpy.error.mock.calls[0][0]);
    expect(errorCall.message).toBe('Request completed with server error');
    expect(errorCall.status).toBe(500);
  });

  test('should log error and rethrow on exception', async () => {
    const c = createMockContext();
    const testError = new Error('Test exception');
    const next = jest.fn().mockRejectedValue(testError);

    await expect(requestLogger(c, next)).rejects.toThrow('Test exception');

    expect(consoleSpy.error).toHaveBeenCalled();
    const errorCall = JSON.parse(consoleSpy.error.mock.calls[0][0]);
    expect(errorCall.message).toBe('Request failed with exception');
    expect(errorCall.durationMs).toBeDefined();
  });

  test('should include request ID in logs', async () => {
    const c = createMockContext({ cfRay: 'unique-ray-123' });
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(logOutput.requestId).toBe('unique-ray-123');
  });

  test('should include user agent in request log', async () => {
    const c = createMockContext({ userAgent: 'Mozilla/5.0' });
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(logOutput.userAgent).toBe('Mozilla/5.0');
  });

  test('should include client IP in request log', async () => {
    const c = createMockContext({ ip: '192.168.1.100' });
    const next = jest.fn().mockResolvedValue(undefined);

    await requestLogger(c, next);

    const logOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    expect(logOutput.ip).toBe('192.168.1.100');
  });
});

describe('getLogger', () => {
  test('should return logger from context', () => {
    const contextStore = new Map();
    const mockLogger = { info: jest.fn() };
    contextStore.set('logger', mockLogger);

    const c = {
      get: key => contextStore.get(key),
    };

    expect(getLogger(c)).toBe(mockLogger);
  });

  test('should return undefined if no logger set', () => {
    const c = {
      get: () => undefined,
    };

    expect(getLogger(c)).toBeUndefined();
  });
});
