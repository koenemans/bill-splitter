import { describe, expect, test } from '@jest/globals';
import { errorHandler } from '../middleware/errorHandler.js';

describe('errorHandler', () => {
  function createMockContext(env = {}) {
    let responseBody = null;
    let responseStatus = 200;

    return {
      env,
      json: (body, status = 200) => {
        responseBody = body;
        responseStatus = status;
        return { body: responseBody, status: responseStatus };
      },
      getResponse: () => ({ body: responseBody, status: responseStatus }),
    };
  }

  test('should return 500 status for generic error', () => {
    const error = new Error('Something went wrong');
    const c = createMockContext();

    const response = errorHandler(error, c);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Something went wrong');
  });

  test('should use error.status if provided', () => {
    const error = new Error('Not found');
    error.status = 404;
    const c = createMockContext();

    const response = errorHandler(error, c);

    expect(response.status).toBe(404);
  });

  test('should hide error details in production', () => {
    const error = new Error('Sensitive error details');
    const c = createMockContext({ ENVIRONMENT: 'production' });

    const response = errorHandler(error, c);

    expect(response.body.error).toBe('Internal server error');
    expect(response.body.stack).toBeUndefined();
  });

  test('should include stack trace in non-production', () => {
    const error = new Error('Debug error');
    const c = createMockContext({ ENVIRONMENT: 'development' });

    const response = errorHandler(error, c);

    expect(response.body.error).toBe('Debug error');
    expect(response.body.stack).toBeDefined();
  });
});
