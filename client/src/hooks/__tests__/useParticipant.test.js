import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { useParticipant } from '../useParticipant';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Properly mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Also set it on global for Node.js environment
global.localStorage = localStorageMock;

describe('useParticipant Hook', () => {
  const mockSplitId = 'test-split-id';
  const mockParticipant = {
    id: 'participant-id',
    name: 'John Doe',
    isDone: false,
  };
  const mockDoneParticipant = {
    id: 'done-participant-id',
    name: 'Jane Smith',
    isDone: true,
  };

  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();

    // Reset any mock implementations to default
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with null currentParticipant', () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      expect(result.current.currentParticipant).toBe(null);
      expect(typeof result.current.setCurrentParticipant).toBe('function');
      expect(typeof result.current.saveParticipant).toBe('function');
      expect(typeof result.current.clearParticipant).toBe('function');
      expect(typeof result.current.restoreParticipant).toBe('function');
    });

    test('should initialize with null when no splitId provided', () => {
      const { result } = renderHook(() => useParticipant(null));

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    test('should initialize with null when splitId is undefined', () => {
      const { result } = renderHook(() => useParticipant(undefined));

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    test('should initialize with null when splitId is empty string', () => {
      const { result } = renderHook(() => useParticipant(''));

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    test('should check localStorage on mount with valid splitId', () => {
      localStorageMock.getItem.mockReturnValue(null);

      renderHook(() => useParticipant(mockSplitId));

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });
  });

  describe('saveParticipant', () => {
    test('should save participant and update state', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`,
        mockParticipant.id
      );
    });

    test('should not save participant without splitId', async () => {
      const { result } = renderHook(() => useParticipant(null));

      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should not save null participant', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.saveParticipant(null);
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should not save undefined participant', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.saveParticipant(undefined);
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should overwrite existing participant', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      // Save first participant
      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);

      // Save different participant
      const newParticipant = { id: 'new-id', name: 'New Name', isDone: false };
      await act(async () => {
        result.current.saveParticipant(newParticipant);
      });

      expect(result.current.currentParticipant).toEqual(newParticipant);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        `bill-splitter-participant-${mockSplitId}`,
        newParticipant.id
      );
    });
  });

  describe('clearParticipant', () => {
    test('should clear participant and localStorage', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      // First save a participant
      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);

      // Then clear it
      await act(async () => {
        result.current.clearParticipant();
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });

    test('should not clear when no splitId', async () => {
      const { result } = renderHook(() => useParticipant(null));

      await act(async () => {
        result.current.clearParticipant();
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    test('should handle clearing when no participant exists', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.clearParticipant();
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });
  });

  describe('restoreParticipant', () => {
    test('should restore participant from split data when saved ID exists', async () => {
      const mockSplit = {
        participants: [
          mockParticipant,
          { id: 'other-id', name: 'Other User', isDone: false },
        ],
      };

      localStorageMock.getItem.mockReturnValue(mockParticipant.id);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.restoreParticipant(mockSplit);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);
    });

    test('should not restore when participant is already set', async () => {
      const mockSplit = {
        participants: [mockParticipant],
      };

      localStorageMock.getItem.mockReturnValue(mockParticipant.id);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      // First set a participant
      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      // Try to restore - should not change
      await act(async () => {
        result.current.restoreParticipant(mockSplit);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);
    });

    test('should not restore when no split provided', async () => {
      localStorageMock.getItem.mockReturnValue(mockParticipant.id);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.restoreParticipant(null);
      });

      expect(result.current.currentParticipant).toBe(null);
    });

    test('should not restore when split is undefined', async () => {
      localStorageMock.getItem.mockReturnValue(mockParticipant.id);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.restoreParticipant(undefined);
      });

      expect(result.current.currentParticipant).toBe(null);
    });

    test('should clear localStorage when saved participant not found in split', async () => {
      const mockSplit = {
        participants: [
          { id: 'different-id', name: 'Different User', isDone: false },
        ],
      };

      localStorageMock.getItem.mockReturnValue('non-existent-id');
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.restoreParticipant(mockSplit);
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });

    test('should clear localStorage when saved participant is done', async () => {
      const mockSplit = {
        participants: [mockDoneParticipant],
      };

      localStorageMock.getItem.mockReturnValue(mockDoneParticipant.id);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.restoreParticipant(mockSplit);
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });

    test('should not restore when no saved participant ID in localStorage', async () => {
      const mockSplit = {
        participants: [mockParticipant],
      };

      localStorageMock.getItem.mockReturnValue(null);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.restoreParticipant(mockSplit);
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    test('should handle empty participants array', async () => {
      const mockSplit = {
        participants: [],
      };

      localStorageMock.getItem.mockReturnValue(mockParticipant.id);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.restoreParticipant(mockSplit);
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });
  });

  describe('setCurrentParticipant', () => {
    test('should allow direct state setting', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        result.current.setCurrentParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);
      // Direct setter should not interact with localStorage
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should allow clearing via direct setter', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      // First set a participant
      await act(async () => {
        result.current.setCurrentParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);

      // Then clear via setter
      await act(async () => {
        result.current.setCurrentParticipant(null);
      });

      expect(result.current.currentParticipant).toBe(null);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle localStorage getItem errors by throwing', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Currently the hook doesn't handle localStorage errors, so it will throw
      expect(() => {
        renderHook(() => useParticipant(mockSplitId));
      }).toThrow('localStorage error');
    });

    test('should handle localStorage setItem errors by throwing', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage setItem error');
      });

      const { result } = renderHook(() => useParticipant(mockSplitId));

      // Currently the hook doesn't handle localStorage errors, so it will throw
      await act(async () => {
        expect(() => {
          result.current.saveParticipant(mockParticipant);
        }).toThrow('localStorage setItem error');
      });
    });

    test('should handle localStorage removeItem errors by throwing', async () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage removeItem error');
      });

      const { result } = renderHook(() => useParticipant(mockSplitId));

      // Currently the hook doesn't handle localStorage errors, so it will throw
      await act(async () => {
        expect(() => {
          result.current.clearParticipant();
        }).toThrow('localStorage removeItem error');
      });
    });

    test('should handle splitId changes', async () => {
      const { result, rerender } = renderHook(
        ({ splitId }) => useParticipant(splitId),
        { initialProps: { splitId: 'split-1' } }
      );

      // Save participant for first split
      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bill-splitter-participant-split-1',
        mockParticipant.id
      );

      // Change splitId
      await act(async () => {
        rerender({ splitId: 'split-2' });
      });

      // Should check localStorage for new split
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'bill-splitter-participant-split-2'
      );
    });

    test('should handle malformed split data by throwing', async () => {
      const malformedSplit = {
        // Missing participants array
      };

      localStorageMock.getItem.mockReturnValue(mockParticipant.id);
      const { result } = renderHook(() => useParticipant(mockSplitId));

      await act(async () => {
        expect(() => {
          result.current.restoreParticipant(malformedSplit);
        }).toThrow("Cannot read properties of undefined (reading 'find')");
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete workflow: save, restore, clear', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      // 1. Save participant
      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`,
        mockParticipant.id
      );

      // 2. Clear current participant (simulate page refresh)
      await act(async () => {
        result.current.setCurrentParticipant(null);
      });

      expect(result.current.currentParticipant).toBe(null);

      // 3. Restore from split data
      const mockSplit = { participants: [mockParticipant] };
      localStorageMock.getItem.mockReturnValue(mockParticipant.id);

      await act(async () => {
        result.current.restoreParticipant(mockSplit);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);

      // 4. Clear completely
      await act(async () => {
        result.current.clearParticipant();
      });

      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });

    test('should handle participant becoming done during session', async () => {
      const { result } = renderHook(() => useParticipant(mockSplitId));

      // Save active participant
      await act(async () => {
        result.current.saveParticipant(mockParticipant);
      });

      expect(result.current.currentParticipant).toEqual(mockParticipant);

      // Clear current participant first (since restoreParticipant has guard clause)
      await act(async () => {
        result.current.setCurrentParticipant(null);
      });

      // Simulate participant becoming done
      const updatedSplit = {
        participants: [{ ...mockParticipant, isDone: true }],
      };

      localStorageMock.getItem.mockReturnValue(mockParticipant.id);

      await act(async () => {
        result.current.restoreParticipant(updatedSplit);
      });

      // Should clear the participant since they're now done
      expect(result.current.currentParticipant).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        `bill-splitter-participant-${mockSplitId}`
      );
    });
  });
});
