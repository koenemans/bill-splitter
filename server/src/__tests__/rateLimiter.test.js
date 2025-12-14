import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { rateLimiter } from '../middleware/rateLimiter.js';

describe('rateLimiter', () => {
  let mockContext;
  let nextCalled;
  let headers;

  beforeEach(() => {
    nextCalled = false;
    headers = {};

    mockContext = {
      req: {
        method: 'GET',
        header: jest.fn(name => {
          if (name === 'cf-connecting-ip') {
            return '192.168.1.1';
          }
          return null;
        }),
      },
      json: (body, status) => ({ body, status }),
      header: (name, value) => {
        headers[name] = value;
      },
    };
  });

  function mockNext() {
    nextCalled = true;
    return Promise.resolve();
  }

  test('should allow requests within limit', async () => {
    await rateLimiter(mockContext, mockNext);

    expect(nextCalled).toBe(true);
    expect(headers['X-RateLimit-Limit']).toBeDefined();
    expect(headers['X-RateLimit-Remaining']).toBeDefined();
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });

  test('should set higher limit for read requests', async () => {
    mockContext.req.method = 'GET';

    await rateLimiter(mockContext, mockNext);

    expect(headers['X-RateLimit-Limit']).toBe('200');
  });

  test('should set lower limit for write requests', async () => {
    mockContext.req.method = 'POST';

    await rateLimiter(mockContext, mockNext);

    expect(headers['X-RateLimit-Limit']).toBe('50');
  });

  test('should use cf-connecting-ip header for IP detection', async () => {
    mockContext.req.header = jest.fn(name => {
      if (name === 'cf-connecting-ip') {
        return '10.0.0.1';
      }
      return null;
    });

    await rateLimiter(mockContext, mockNext);

    expect(mockContext.req.header).toHaveBeenCalledWith('cf-connecting-ip');
    expect(nextCalled).toBe(true);
  });

  test('should fallback to x-forwarded-for header', async () => {
    mockContext.req.header = jest.fn(name => {
      if (name === 'x-forwarded-for') {
        return '10.0.0.2, proxy1, proxy2';
      }
      return null;
    });

    await rateLimiter(mockContext, mockNext);

    expect(nextCalled).toBe(true);
  });

  test('should handle unknown IP gracefully', async () => {
    mockContext.req.header = jest.fn(() => null);

    await rateLimiter(mockContext, mockNext);

    expect(nextCalled).toBe(true);
  });

  test('should track different methods separately', async () => {
    const getContext = {
      ...mockContext,
      req: { ...mockContext.req, method: 'GET' },
    };
    const postContext = {
      ...mockContext,
      req: { ...mockContext.req, method: 'POST' },
    };

    await rateLimiter(getContext, mockNext);
    await rateLimiter(postContext, mockNext);

    expect(nextCalled).toBe(true);
  });

  test('should apply rate limiting to PATCH requests as write', async () => {
    mockContext.req.method = 'PATCH';

    await rateLimiter(mockContext, mockNext);

    expect(headers['X-RateLimit-Limit']).toBe('50');
  });

  test('should apply rate limiting to DELETE requests as write', async () => {
    mockContext.req.method = 'DELETE';

    await rateLimiter(mockContext, mockNext);

    expect(headers['X-RateLimit-Limit']).toBe('50');
  });

  test('should apply rate limiting to PUT requests as write', async () => {
    mockContext.req.method = 'PUT';

    await rateLimiter(mockContext, mockNext);

    expect(headers['X-RateLimit-Limit']).toBe('50');
  });
});
