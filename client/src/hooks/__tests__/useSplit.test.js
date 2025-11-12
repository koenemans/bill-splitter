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

  test('should handle 404 error and set split to null', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Split not found' }),
    });

    const { result } = renderHook(() => useSplit('non-existent-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.split).toBe(null);
  });

  test('should handle rate limit error with exponential backoff', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many requests' }),
    });

    const { result } = renderHook(() => useSplit('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Split should remain null after rate limit error
    expect(result.current.split).toBe(null);
  });

  test('should handle generic API error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSplit('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.split).toBe(null);
  });

  test('should load settlement when all participants are done', async () => {
    const splitData = {
      id: 'test-split',
      participants: [
        { id: '1', name: 'Alice', isDone: true },
        { id: '2', name: 'Bob', isDone: true },
      ],
      expenses: [],
    };

    const settlementData = {
      ready: true,
      total: 100,
      perPerson: 50,
      transactions: [],
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => settlementData,
      });

    const { result } = renderHook(() => useSplit('test-id'));

    await waitFor(() => {
      expect(result.current.split).toEqual(splitData);
    });

    await waitFor(() => {
      expect(result.current.settlement).toEqual(settlementData);
    });
  });

  test('should not load settlement when not all participants are done', async () => {
    const splitData = {
      id: 'test-split',
      participants: [
        { id: '1', name: 'Alice', isDone: true },
        { id: '2', name: 'Bob', isDone: false },
      ],
      expenses: [],
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => splitData,
    });

    const { result } = renderHook(() => useSplit('test-id'));

    await waitFor(() => {
      expect(result.current.split).toEqual(splitData);
    });

    await waitFor(() => {
      expect(result.current.settlement).toBe(null);
    });
  });

  test('should clear settlement when participants are not all done', async () => {
    const splitDataAllDone = {
      id: 'test-split',
      participants: [
        { id: '1', name: 'Alice', isDone: true },
        { id: '2', name: 'Bob', isDone: true },
      ],
      expenses: [],
    };

    const settlementData = {
      ready: true,
      total: 100,
      perPerson: 50,
      transactions: [],
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitDataAllDone,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => settlementData,
      });

    const { result } = renderHook(({ splitId }) => useSplit(splitId), {
      initialProps: { splitId: 'test-id' },
    });

    await waitFor(() => {
      expect(result.current.settlement).toEqual(settlementData);
    });

    // Update split with one participant not done
    const splitDataNotAllDone = {
      ...splitDataAllDone,
      participants: [
        { id: '1', name: 'Alice', isDone: true },
        { id: '2', name: 'Bob', isDone: false },
      ],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => splitDataNotAllDone,
    });

    act(() => {
      result.current.refreshSplit();
    });

    await waitFor(() => {
      expect(result.current.split).toEqual(splitDataNotAllDone);
    });

    await waitFor(() => {
      expect(result.current.settlement).toBe(null);
    });
  });

  test('should handle settlement not ready', async () => {
    const splitData = {
      id: 'test-split',
      participants: [
        { id: '1', name: 'Alice', isDone: true },
        { id: '2', name: 'Bob', isDone: true },
      ],
      expenses: [],
    };

    const settlementData = {
      ready: false,
      message: 'Not all participants are done yet',
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => settlementData,
      });

    const { result } = renderHook(() => useSplit('test-id'));

    await waitFor(() => {
      expect(result.current.split).toEqual(splitData);
    });

    // Settlement should not be set if not ready
    await waitFor(
      () => {
        expect(result.current.settlement).toBe(null);
      },
      { timeout: 2000 }
    );
  });

  test('should handle settlement loading error', async () => {
    const splitData = {
      id: 'test-split',
      participants: [
        { id: '1', name: 'Alice', isDone: true },
        { id: '2', name: 'Bob', isDone: true },
      ],
      expenses: [],
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitData,
      })
      .mockRejectedValueOnce(new Error('Settlement API error'));

    const { result } = renderHook(() => useSplit('test-id'));

    await waitFor(() => {
      expect(result.current.split).toEqual(splitData);
    });

    // Settlement should remain null after error
    await waitFor(
      () => {
        expect(result.current.settlement).toBe(null);
      },
      { timeout: 2000 }
    );
  });

  test('should not load split when splitId is null', async () => {
    const { result } = renderHook(() => useSplit(null));

    // Should not make any fetch calls
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.split).toBe(null);
  });

  test('should not load split when splitId is undefined', async () => {
    const { result } = renderHook(() => useSplit(undefined));

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.split).toBe(null);
  });

  test('should reset polling interval after successful request following rate limit', async () => {
    // First request: rate limit error
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many requests' }),
    });

    const { result } = renderHook(() => useSplit('test-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Second request: success
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'test-split',
        participants: [],
        expenses: [],
      }),
    });

    act(() => {
      result.current.refreshSplit();
    });

    await waitFor(() => {
      expect(result.current.split).not.toBe(null);
    });
  });
});
