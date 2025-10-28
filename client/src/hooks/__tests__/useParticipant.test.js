import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { useParticipant } from '../useParticipant';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('useParticipant Hook', () => {
  const mockSplitId = 'test-split-id';
  const mockParticipant = {
    id: 'participant-id',
    name: 'John Doe',
    isDone: false
  };

  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with null currentParticipant', () => {
    const { result } = renderHook(() => useParticipant(mockSplitId));

    expect(result.current.currentParticipant).toBe(null);
    expect(typeof result.current.setCurrentParticipant).toBe('function');
    expect(typeof result.current.saveParticipant).toBe('function');
    expect(typeof result.current.clearParticipant).toBe('function');
    expect(typeof result.current.restoreParticipant).toBe('function');
  });

  test('should save participant', () => {
    const { result } = renderHook(() => useParticipant(mockSplitId));

    act(() => {
      result.current.saveParticipant(mockParticipant);
    });

    expect(result.current.currentParticipant).toEqual(mockParticipant);
  });

  test('should not save participant without splitId', () => {
    const { result } = renderHook(() => useParticipant(null));

    act(() => {
      result.current.saveParticipant(mockParticipant);
    });

    expect(result.current.currentParticipant).toBe(null);
  });




});
