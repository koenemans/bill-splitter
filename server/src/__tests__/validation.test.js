import { describe, expect, jest, test } from '@jest/globals';
import {
  validateExpense,
  validateParticipant,
  validateSplitId,
} from '../middleware/validation.js';

// Helper to create mock Hono context
function createMockContext(overrides = {}) {
  const jsonMock = jest.fn((data, status) => ({ data, status }));
  const setMock = jest.fn();

  return {
    req: {
      param: jest.fn(name => overrides.params?.[name]),
      json: jest.fn(() => Promise.resolve(overrides.body)),
    },
    json: jsonMock,
    set: setMock,
    _jsonMock: jsonMock,
    _setMock: setMock,
  };
}

describe('Validation Middleware', () => {
  describe('validateSplitId', () => {
    test('should reject null split ID', async () => {
      const c = createMockContext({ params: { id: null } });
      const next = jest.fn();

      const result = await validateSplitId(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.error).toBe('Invalid split ID');
    });

    test('should pass for valid 12-character split ID', async () => {
      const c = createMockContext({ params: { id: 'abc123def456' } });
      const next = jest.fn();

      await validateSplitId(c, next);

      expect(next).toHaveBeenCalled();
      expect(c._jsonMock).not.toHaveBeenCalled();
    });

    test('should reject missing split ID', async () => {
      const c = createMockContext({ params: {} });
      const next = jest.fn();

      const result = await validateSplitId(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.error).toBe('Invalid split ID');
      expect(result.status).toBe(400);
    });

    test('should reject split ID with wrong length', async () => {
      const c = createMockContext({ params: { id: 'short' } });
      const next = jest.fn();

      const result = await validateSplitId(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.error).toBe('Invalid split ID');
      expect(result.status).toBe(400);
    });
  });

  describe('validateParticipant', () => {
    test('should reject invalid JSON body', async () => {
      const c = createMockContext({});
      c.req.json = jest.fn(() => Promise.reject(new Error('Invalid JSON')));
      const next = jest.fn();

      const result = await validateParticipant(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.error).toBe('Invalid JSON body');
      expect(result.status).toBe(400);
    });

    test('should reject non-string name', async () => {
      const c = createMockContext({ body: { name: 123 } });
      const next = jest.fn();

      const result = await validateParticipant(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details).toContain('Name is required');
    });

    test('should pass for valid participant name', async () => {
      const c = createMockContext({ body: { name: 'John Doe' } });
      const next = jest.fn();

      await validateParticipant(c, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject missing name', async () => {
      const c = createMockContext({ body: {} });
      const next = jest.fn();

      const result = await validateParticipant(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.error).toBe('Validation failed');
      expect(result.data.details).toContain('Name is required');
    });

    test('should reject empty name', async () => {
      const c = createMockContext({ body: { name: '   ' } });
      const next = jest.fn();

      const result = await validateParticipant(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details).toContain('Name is required');
    });

    test('should reject name exceeding max length', async () => {
      const longName = 'a'.repeat(101);
      const c = createMockContext({ body: { name: longName } });
      const next = jest.fn();

      const result = await validateParticipant(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details[0]).toContain('under 100 characters');
    });
  });

  describe('validateExpense', () => {
    test('should reject invalid JSON body', async () => {
      const c = createMockContext({});
      c.req.json = jest.fn(() => Promise.reject(new Error('Invalid JSON')));
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.error).toBe('Invalid JSON body');
      expect(result.status).toBe(400);
    });

    test('should reject empty description', async () => {
      const c = createMockContext({
        body: {
          participantId: 'abc1234567',
          description: '   ',
          amount: 25.5,
        },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details).toContain('Description is required');
    });

    test('should reject description exceeding max length', async () => {
      const longDesc = 'a'.repeat(201);
      const c = createMockContext({
        body: {
          participantId: 'abc1234567',
          description: longDesc,
          amount: 25.5,
        },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details[0]).toContain('under 200 characters');
    });

    test('should reject missing amount', async () => {
      const c = createMockContext({
        body: {
          participantId: 'abc1234567',
          description: 'Dinner',
        },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details).toContain('Amount is required');
    });

    test('should reject NaN amount', async () => {
      const c = createMockContext({
        body: {
          participantId: 'abc1234567',
          description: 'Dinner',
          amount: 'not-a-number',
        },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details[0]).toContain('Amount must be between');
    });

    test('should pass for valid expense', async () => {
      const c = createMockContext({
        body: {
          participantId: 'abc1234567',
          description: 'Dinner',
          amount: 25.5,
        },
      });
      const next = jest.fn();

      await validateExpense(c, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject missing participantId', async () => {
      const c = createMockContext({
        body: { description: 'Dinner', amount: 25.5 },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details).toContain('Participant ID is required');
    });

    test('should reject missing description', async () => {
      const c = createMockContext({
        body: { participantId: 'abc1234567', amount: 25.5 },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details).toContain('Description is required');
    });

    test('should reject invalid amount', async () => {
      const c = createMockContext({
        body: {
          participantId: 'abc1234567',
          description: 'Dinner',
          amount: -5,
        },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details[0]).toContain('Amount must be between');
    });

    test('should reject amount exceeding maximum', async () => {
      const c = createMockContext({
        body: {
          participantId: 'abc1234567',
          description: 'Dinner',
          amount: 1000001,
        },
      });
      const next = jest.fn();

      const result = await validateExpense(c, next);

      expect(next).not.toHaveBeenCalled();
      expect(result.data.details[0]).toContain('Amount must be between');
    });
  });
});
