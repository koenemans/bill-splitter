import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Redis from 'ioredis-mock';
import { RedisSplitRepository } from '../repositories/RedisSplitRepository.js';

describe('RedisSplitRepository', () => {
  let repository;
  let mockRedis;

  beforeEach(() => {
    mockRedis = new Redis({
      data: {},
    });
    repository = new RedisSplitRepository();
    // Replace the internal Redis instance with mock
    repository.redis = mockRedis;
    repository.ttl = 86400; // 24 hours for testing
    repository.ttlSeconds = 86400;
  });

  afterEach(async () => {
    await mockRedis.flushall();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      // Create a fresh repository instance for this test
      const freshRepository = new RedisSplitRepository();
      const freshRedis = new Redis({ data: {} });
      freshRepository.redis = freshRedis;

      // Mock the connect method to avoid connection state issues
      freshRepository.redis.connect = () => Promise.resolve();

      await expect(freshRepository.connect()).resolves.not.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new split', async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [],
        expenses: [],
      };

      const result = await repository.create(split);
      expect(result).toEqual(split);

      // Verify split is stored in Redis
      const stored = await repository.findById(split.id);
      expect(stored).toEqual(split);
    });

    it('should set expiration on split', async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [],
        expenses: [],
      };

      await repository.create(split);

      // Check if TTL is set
      const ttl = await mockRedis.ttl('split:test-split-123');
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('should return split when found', async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [],
        expenses: [],
      };

      await repository.create(split);
      const result = await repository.findById(split.id);
      expect(result).toEqual(split);
    });

    it('should return null when split not found', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('addParticipant', () => {
    beforeEach(async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [],
        expenses: [],
      };
      await repository.create(split);
    });

    it('should add participant to split', async () => {
      const participant = {
        id: 'participant-1',
        name: 'John Doe',
        isDone: false,
      };

      const result = await repository.addParticipant(
        'test-split-123',
        participant
      );
      expect(result).toEqual(participant);

      const split = await repository.findById('test-split-123');
      expect(split.participants).toContainEqual(participant);
    });

    it('should throw error when split not found', async () => {
      const participant = {
        id: 'participant-1',
        name: 'John Doe',
        isDone: false,
      };

      await expect(
        repository.addParticipant('non-existent', participant)
      ).rejects.toThrow('Split not found');
    });

    it('should throw error when max participants reached', async () => {
      // Add max participants
      for (let i = 0; i < 50; i++) {
        const participant = {
          id: `participant-${i}`,
          name: `Participant ${i}`,
          isDone: false,
        };
        await repository.addParticipant('test-split-123', participant);
      }

      const extraParticipant = {
        id: 'participant-51',
        name: 'Extra Participant',
        isDone: false,
      };

      await expect(
        repository.addParticipant('test-split-123', extraParticipant)
      ).rejects.toThrow('Maximum 50 participants allowed');
    });
  });

  describe('addExpense', () => {
    beforeEach(async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [
          {
            id: 'participant-1',
            name: 'John Doe',
            isDone: false,
          },
        ],
        expenses: [],
      };
      await repository.create(split);
    });

    it('should add expense to split', async () => {
      const expense = {
        id: 'expense-1',
        participantId: 'participant-1',
        description: 'Dinner',
        amount: 50.0,
      };

      const result = await repository.addExpense('test-split-123', expense);
      expect(result).toEqual(expense);

      const split = await repository.findById('test-split-123');
      expect(split.expenses).toContainEqual(expense);
    });

    it('should throw error when split not found', async () => {
      const expense = {
        id: 'expense-1',
        participantId: 'participant-1',
        description: 'Dinner',
        amount: 50.0,
      };

      await expect(
        repository.addExpense('non-existent', expense)
      ).rejects.toThrow('Split not found');
    });

    it('should throw error when max expenses reached', async () => {
      // Add max expenses
      for (let i = 0; i < 500; i++) {
        const expense = {
          id: `expense-${i}`,
          participantId: 'participant-1',
          description: `Expense ${i}`,
          amount: 10.0,
        };
        await repository.addExpense('test-split-123', expense);
      }

      const extraExpense = {
        id: 'expense-501',
        participantId: 'participant-1',
        description: 'Extra Expense',
        amount: 10.0,
      };

      await expect(
        repository.addExpense('test-split-123', extraExpense)
      ).rejects.toThrow('Maximum 500 expenses allowed');
    });
  });

  describe('deleteExpense', () => {
    beforeEach(async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [
          {
            id: 'participant-1',
            name: 'John Doe',
            isDone: false,
          },
        ],
        expenses: [
          {
            id: 'expense-1',
            participantId: 'participant-1',
            description: 'Dinner',
            amount: 50.0,
          },
        ],
      };
      await repository.create(split);
    });

    it('should delete expense from split', async () => {
      // Add expense directly to Redis to match the structure
      await mockRedis.sadd(
        'split:test-split-123:expenses',
        JSON.stringify({
          id: 'expense-1',
          participantId: 'participant-1',
          description: 'Dinner',
          amount: 50.0,
        })
      );

      const result = await repository.deleteExpense(
        'test-split-123',
        'expense-1'
      );
      expect(result).toBe(true);

      const split = await repository.findById('test-split-123');
      expect(split.expenses).toHaveLength(0);
    });

    it('should throw error when split not found', async () => {
      await expect(
        repository.deleteExpense('non-existent', 'expense-1')
      ).rejects.toThrow('Split not found');
    });

    it('should throw error when expense not found', async () => {
      await expect(
        repository.deleteExpense('test-split-123', 'non-existent-expense')
      ).rejects.toThrow('Expense not found');
    });
  });

  describe('updateParticipantStatus', () => {
    beforeEach(async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [
          {
            id: 'participant-1',
            name: 'John Doe',
            isDone: false,
          },
        ],
        expenses: [],
      };
      await repository.create(split);
    });

    it('should update participant status to done', async () => {
      // Add participant directly to Redis to match the structure
      await mockRedis.sadd(
        'split:test-split-123:participants',
        JSON.stringify({
          id: 'participant-1',
          name: 'John Doe',
          isDone: false,
        })
      );

      const result = await repository.updateParticipantStatus(
        'test-split-123',
        'participant-1',
        true
      );
      expect(result.isDone).toBe(true);

      const split = await repository.findById('test-split-123');
      expect(split.participants[0].isDone).toBe(true);
    });

    it('should update participant status to not done', async () => {
      // Add participant directly to Redis to match the structure
      await mockRedis.sadd(
        'split:test-split-123:participants',
        JSON.stringify({
          id: 'participant-1',
          name: 'John Doe',
          isDone: false,
        })
      );

      // First set to done
      await repository.updateParticipantStatus(
        'test-split-123',
        'participant-1',
        true
      );

      // Then set to not done
      const result = await repository.updateParticipantStatus(
        'test-split-123',
        'participant-1',
        false
      );
      expect(result.isDone).toBe(false);

      const split = await repository.findById('test-split-123');
      expect(split.participants[0].isDone).toBe(false);
    });

    it('should throw error when split not found', async () => {
      await expect(
        repository.updateParticipantStatus(
          'non-existent',
          'participant-1',
          true
        )
      ).rejects.toThrow('Split not found');
    });

    it('should throw error when participant not found', async () => {
      await expect(
        repository.updateParticipantStatus(
          'test-split-123',
          'non-existent',
          true
        )
      ).rejects.toThrow('Participant not found');
    });
  });

  describe('getActiveSplitsCount', () => {
    it('should return 0 when no splits exist', async () => {
      const count = await repository.getActiveSplitsCount();
      expect(count).toBe(0);
    });

    it('should return correct count when splits exist', async () => {
      // Create multiple splits
      for (let i = 0; i < 3; i++) {
        const split = {
          id: `split-${i}`,
          createdAt: '2023-01-01T00:00:00.000Z',
          participants: [],
          expenses: [],
        };
        await repository.create(split);
      }

      const count = await repository.getActiveSplitsCount();
      expect(count).toBe(3);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      const split = {
        id: 'test-split-123',
        createdAt: '2023-01-01T00:00:00.000Z',
        participants: [
          {
            id: 'participant-1',
            name: 'John Doe',
            isDone: false,
          },
        ],
        expenses: [
          {
            id: 'expense-1',
            participantId: 'participant-1',
            description: 'Dinner',
            amount: 50.0,
          },
        ],
      };
      await repository.create(split);
    });

    it('should delete split and all related data', async () => {
      const result = await repository.delete('test-split-123');
      expect(result).toBe(true);

      const split = await repository.findById('test-split-123');
      expect(split).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Redis is healthy', async () => {
      const result = await repository.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when Redis is unhealthy', async () => {
      // Simulate Redis failure by overriding the ping method
      repository.redis.ping = () =>
        Promise.reject(new Error('Connection failed'));

      const result = await repository.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect without throwing', async () => {
      await expect(repository.disconnect()).resolves.not.toThrow();
    });
  });
});
