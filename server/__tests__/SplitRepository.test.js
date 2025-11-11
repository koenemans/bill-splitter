import { beforeEach, describe, expect, test } from '@jest/globals';
import { SplitRepository } from '../repositories/SplitRepository.js';

describe('SplitRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new SplitRepository();
  });

  describe('Interface contract', () => {
    test('should throw error when connect() is not implemented', () => {
      expect(() => repository.connect()).toThrow(
        'connect() must be implemented'
      );
    });

    test('should throw error when create() is not implemented', () => {
      expect(() => repository.create({})).toThrow(
        'create() must be implemented'
      );
    });

    test('should throw error when findById() is not implemented', () => {
      expect(() => repository.findById('test-id')).toThrow(
        'findById() must be implemented'
      );
    });

    test('should throw error when addParticipant() is not implemented', () => {
      expect(() => repository.addParticipant('split-id', {})).toThrow(
        'addParticipant() must be implemented'
      );
    });

    test('should throw error when addExpense() is not implemented', () => {
      expect(() => repository.addExpense('split-id', {})).toThrow(
        'addExpense() must be implemented'
      );
    });

    test('should throw error when deleteExpense() is not implemented', () => {
      expect(() => repository.deleteExpense('split-id', 'expense-id')).toThrow(
        'deleteExpense() must be implemented'
      );
    });

    test('should throw error when updateParticipantStatus() is not implemented', () => {
      expect(() =>
        repository.updateParticipantStatus('split-id', 'participant-id', true)
      ).toThrow('updateParticipantStatus() must be implemented');
    });

    test('should throw error when getActiveSplitsCount() is not implemented', () => {
      expect(() => repository.getActiveSplitsCount()).toThrow(
        'getActiveSplitsCount() must be implemented'
      );
    });

    test('should throw error when delete() is not implemented', () => {
      expect(() => repository.delete('split-id')).toThrow(
        'delete() must be implemented'
      );
    });

    test('should throw error when disconnect() is not implemented', () => {
      expect(() => repository.disconnect()).toThrow(
        'disconnect() must be implemented'
      );
    });

    test('should throw error when healthCheck() is not implemented', () => {
      expect(() => repository.healthCheck()).toThrow(
        'healthCheck() must be implemented'
      );
    });
  });

  describe('Method signatures', () => {
    test('should have all required methods defined', () => {
      expect(typeof repository.connect).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.addParticipant).toBe('function');
      expect(typeof repository.addExpense).toBe('function');
      expect(typeof repository.deleteExpense).toBe('function');
      expect(typeof repository.updateParticipantStatus).toBe('function');
      expect(typeof repository.getActiveSplitsCount).toBe('function');
      expect(typeof repository.delete).toBe('function');
      expect(typeof repository.disconnect).toBe('function');
      expect(typeof repository.healthCheck).toBe('function');
    });

    test('should accept correct parameters for create()', () => {
      const split = { id: 'test', participants: [], expenses: [] };
      expect(() => repository.create(split)).toThrow();
    });

    test('should accept correct parameters for findById()', () => {
      expect(() => repository.findById('test-id')).toThrow();
    });

    test('should accept correct parameters for addParticipant()', () => {
      const participant = { id: 'p1', name: 'John' };
      expect(() => repository.addParticipant('split-id', participant)).toThrow();
    });

    test('should accept correct parameters for addExpense()', () => {
      const expense = { id: 'e1', amount: 10, description: 'Test' };
      expect(() => repository.addExpense('split-id', expense)).toThrow();
    });

    test('should accept correct parameters for deleteExpense()', () => {
      expect(() => repository.deleteExpense('split-id', 'expense-id')).toThrow();
    });

    test('should accept correct parameters for updateParticipantStatus()', () => {
      expect(() =>
        repository.updateParticipantStatus('split-id', 'participant-id', false)
      ).toThrow();
    });
  });
});
