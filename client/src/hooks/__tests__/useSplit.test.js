import { act, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { useSplit } from '../useSplit';

// Mock fetch globally
global.fetch = jest.fn();

describe('useSplit Hook - Basic Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock successful responses by default
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-split', participants: [], expenses: [] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with correct default state when no splitId provided', () => {
    const { result } = renderHook(() => useSplit(null));

    expect(result.current.split).toBe(null);
    expect(result.current.settlement).toBe(null);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.refreshSplit).toBe('function');
    expect(typeof result.current.loadSettlement).toBe('function');
  });

  test('should provide all required hook methods', async () => {
    const { result } = renderHook(() => useSplit('test-id'));

    // Test that all expected methods and properties exist
    expect(result.current).toHaveProperty('split');
    expect(result.current).toHaveProperty('settlement');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refreshSplit');
    expect(result.current).toHaveProperty('loadSettlement');

    // Test that methods are functions
    expect(typeof result.current.refreshSplit).toBe('function');
    expect(typeof result.current.loadSettlement).toBe('function');

    // Wait for async state updates to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  test('should handle refreshSplit call without errors', async () => {
    const { result } = renderHook(() => useSplit('test-id'));

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.refreshSplit();
    });

    // Wait for refresh to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  test('should handle loadSettlement call without errors', async () => {
    const { result } = renderHook(() => useSplit('test-id'));

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadSettlement();
    });
  });
});
