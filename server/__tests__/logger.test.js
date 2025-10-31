import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { createContextualLogger } from '../utils/logger.js';

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
  });
});
