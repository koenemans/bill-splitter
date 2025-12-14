import { D1SplitRepository } from '../repositories/D1SplitRepository.js';
import { beforeEach, describe, expect, test } from '@jest/globals';

// Mock D1 database
function createMockD1() {
  const data = {
    splits: new Map(),
    participants: new Map(),
    expenses: new Map(),
  };

  const createStatement = sql => ({
    first: () => {
      // Handle queries without bind parameters
      if (sql.includes('COUNT(*)') && sql.includes('splits')) {
        return Promise.resolve({ count: data.splits.size });
      }
      return Promise.resolve(null);
    },
    bind: (...params) => ({
      run: () => {
        // Handle INSERT
        if (sql.includes('INSERT INTO splits')) {
          data.splits.set(params[0], {
            id: params[0],
            created_at: params[1],
          });
          return Promise.resolve({ success: true });
        }
        if (sql.includes('INSERT INTO participants')) {
          const key = `${params[1]}-${params[0]}`;
          data.participants.set(key, {
            id: params[0],
            split_id: params[1],
            name: params[2],
            is_done: params[3],
          });
          return Promise.resolve({ success: true });
        }
        if (sql.includes('INSERT INTO expenses')) {
          const key = `${params[1]}-${params[0]}`;
          data.expenses.set(key, {
            id: params[0],
            split_id: params[1],
            participant_id: params[2],
            description: params[3],
            amount: params[4],
          });
          return Promise.resolve({ success: true });
        }
        if (sql.includes('DELETE FROM expenses')) {
          for (const [expKey, exp] of data.expenses.entries()) {
            if (exp.id === params[0]) {
              data.expenses.delete(expKey);
              break;
            }
          }
          return Promise.resolve({ success: true });
        }
        if (sql.includes('UPDATE participants')) {
          for (const p of data.participants.values()) {
            if (p.id === params[1]) {
              p.is_done = params[0];
              break;
            }
          }
          return Promise.resolve({ success: true });
        }
        if (sql.includes('DELETE FROM splits')) {
          data.splits.delete(params[0]);
          // Also delete related participants and expenses
          for (const [pKey, p] of data.participants.entries()) {
            if (p.split_id === params[0]) {
              data.participants.delete(pKey);
            }
          }
          for (const [eKey, e] of data.expenses.entries()) {
            if (e.split_id === params[0]) {
              data.expenses.delete(eKey);
            }
          }
          return Promise.resolve({ changes: 1 });
        }
        return Promise.resolve({ success: true });
      },
      first: () => {
        // Handle SELECT queries
        if (sql.includes('SELECT 1')) {
          return { 1: 1 };
        }
        if (sql.includes('SELECT id, created_at') && sql.includes('splits')) {
          const split = data.splits.get(params[0]);
          return split ? { id: split.id, createdAt: split.created_at } : null;
        }
        if (sql.includes('SELECT id FROM splits')) {
          return data.splits.get(params[0]) || null;
        }
        if (sql.includes('SELECT id FROM participants')) {
          for (const p of data.participants.values()) {
            if (p.id === params[0] && p.split_id === params[1]) {
              return { id: p.id };
            }
          }
          return null;
        }
        if (
          sql.includes('SELECT id, name, is_done') &&
          sql.includes('participants')
        ) {
          for (const p of data.participants.values()) {
            if (p.id === params[0] && p.split_id === params[1]) {
              return { id: p.id, name: p.name, isDone: p.is_done };
            }
          }
          return null;
        }
        if (sql.includes('SELECT id FROM expenses')) {
          for (const e of data.expenses.values()) {
            if (e.id === params[0] && e.split_id === params[1]) {
              return { id: e.id };
            }
          }
          return null;
        }
        if (sql.includes('COUNT(*)') && sql.includes('participants')) {
          let count = 0;
          for (const p of data.participants.values()) {
            if (p.split_id === params[0]) {
              count++;
            }
          }
          return { count };
        }
        if (sql.includes('COUNT(*)') && sql.includes('expenses')) {
          let count = 0;
          for (const e of data.expenses.values()) {
            if (e.split_id === params[0]) {
              count++;
            }
          }
          return { count };
        }
        if (sql.includes('COUNT(*)') && sql.includes('splits')) {
          return { count: data.splits.size };
        }
        return Promise.resolve(null);
      },
      all: () => {
        if (
          sql.includes('SELECT id, name, is_done') &&
          sql.includes('participants')
        ) {
          const results = [];
          for (const p of data.participants.values()) {
            if (p.split_id === params[0]) {
              results.push({ id: p.id, name: p.name, isDone: p.is_done });
            }
          }
          return Promise.resolve({ results });
        }
        if (
          sql.includes('SELECT id, participant_id') &&
          sql.includes('expenses')
        ) {
          const results = [];
          for (const e of data.expenses.values()) {
            if (e.split_id === params[0]) {
              results.push({
                id: e.id,
                participantId: e.participant_id,
                description: e.description,
                amount: e.amount,
              });
            }
          }
          return Promise.resolve({ results });
        }
        return Promise.resolve({ results: [] });
      },
    }),
  });

  return {
    prepare: sql => createStatement(sql),
    _data: data,
  };
}

describe('D1SplitRepository', () => {
  let repository;
  let mockDb;

  beforeEach(() => {
    mockDb = createMockD1();
    repository = new D1SplitRepository(mockDb, {
      maxParticipants: 50,
      maxExpenses: 500,
      maxTotalSplits: 10000,
      splitExpiryHours: 24,
    });
  });

  describe('create', () => {
    test('should create a new split with generated ID', async () => {
      const split = await repository.create();

      expect(split).toHaveProperty('id');
      expect(split.id).toHaveLength(12);
      expect(split).toHaveProperty('createdAt');
      expect(split.participants).toEqual([]);
      expect(split.expenses).toEqual([]);
    });
  });

  describe('findById', () => {
    test('should return null for non-existent split', async () => {
      const result = await repository.findById('nonexistent1');
      expect(result).toBeNull();
    });

    test('should return split with participants and expenses', async () => {
      const created = await repository.create();
      const result = await repository.findById(created.id);

      expect(result).not.toBeNull();
      expect(result.id).toBe(created.id);
      expect(result.participants).toEqual([]);
      expect(result.expenses).toEqual([]);
    });
  });

  describe('addParticipant', () => {
    test('should add participant to existing split', async () => {
      const split = await repository.create();
      const participant = await repository.addParticipant(split.id, 'John Doe');

      expect(participant).toHaveProperty('id');
      expect(participant.id).toHaveLength(10);
      expect(participant.name).toBe('John Doe');
      expect(participant.isDone).toBe(false);
    });

    test('should throw error for non-existent split', async () => {
      await expect(
        repository.addParticipant('nonexistent1', 'John Doe')
      ).rejects.toThrow('Split not found');
    });
  });

  describe('addExpense', () => {
    test('should add expense to existing split and participant', async () => {
      const split = await repository.create();
      const participant = await repository.addParticipant(split.id, 'John Doe');
      const expense = await repository.addExpense(
        split.id,
        participant.id,
        'Dinner',
        25.5
      );

      expect(expense).toHaveProperty('id');
      expect(expense.id).toHaveLength(10);
      expect(expense.participantId).toBe(participant.id);
      expect(expense.description).toBe('Dinner');
      expect(expense.amount).toBe(25.5);
    });

    test('should throw error for non-existent split', async () => {
      await expect(
        repository.addExpense('nonexistent1', 'participant1', 'Dinner', 25.5)
      ).rejects.toThrow('Split not found');
    });

    test('should throw error for non-existent participant', async () => {
      const split = await repository.create();
      await expect(
        repository.addExpense(split.id, 'nonexistent1', 'Dinner', 25.5)
      ).rejects.toThrow('Participant not found');
    });
  });

  describe('deleteExpense', () => {
    test('should delete existing expense', async () => {
      const split = await repository.create();
      const participant = await repository.addParticipant(split.id, 'John Doe');
      const expense = await repository.addExpense(
        split.id,
        participant.id,
        'Dinner',
        25.5
      );

      const result = await repository.deleteExpense(split.id, expense.id);
      expect(result).toBe(true);
    });

    test('should throw error for non-existent split', async () => {
      await expect(
        repository.deleteExpense('nonexistent1', 'expense123')
      ).rejects.toThrow('Split not found');
    });
  });

  describe('updateParticipantStatus', () => {
    test('should update participant status to done', async () => {
      const split = await repository.create();
      const participant = await repository.addParticipant(split.id, 'John Doe');

      const updated = await repository.updateParticipantStatus(
        split.id,
        participant.id,
        true
      );

      expect(updated.id).toBe(participant.id);
      expect(updated.name).toBe('John Doe');
      expect(updated.isDone).toBe(true);
    });

    test('should throw error for non-existent split', async () => {
      await expect(
        repository.updateParticipantStatus('nonexistent1', 'participant1', true)
      ).rejects.toThrow('Split not found');
    });

    test('should throw error for non-existent participant', async () => {
      const split = await repository.create();
      await expect(
        repository.updateParticipantStatus(split.id, 'nonexistent1', true)
      ).rejects.toThrow('Participant not found');
    });
  });

  describe('getActiveSplitsCount', () => {
    test('should return count of active splits', async () => {
      expect(await repository.getActiveSplitsCount()).toBe(0);

      await repository.create();
      expect(await repository.getActiveSplitsCount()).toBe(1);

      await repository.create();
      expect(await repository.getActiveSplitsCount()).toBe(2);
    });
  });

  describe('delete', () => {
    test('should delete existing split', async () => {
      const split = await repository.create();
      const result = await repository.delete(split.id);

      expect(result).toBe(true);
    });
  });
});
