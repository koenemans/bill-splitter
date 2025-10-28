import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { useApi, useSplitApi } from '../useApi';

// Mock fetch globally
global.fetch = jest.fn();

describe('useApi Hook', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useApi());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.apiCall).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  test('should handle successful API call', async () => {
    const mockData = { id: '123', name: 'Test' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useApi());

    let apiResult;
    await act(async () => {
      apiResult = await result.current.apiCall('/test-endpoint');
    });

    expect(fetch).toHaveBeenCalledWith('/test-endpoint', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(apiResult).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should handle API error response', async () => {
    const errorData = { error: 'Something went wrong' };
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => errorData,
    });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      try {
        await result.current.apiCall('/test-endpoint');
      } catch (error) {
        expect(error.message).toBe('Something went wrong');
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Something went wrong');
  });

  test('should handle network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useApi());

    await act(async () => {
      try {
        await result.current.apiCall('/test-endpoint');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  test('should clear error', async () => {
    fetch.mockRejectedValueOnce(new Error('Test error'));

    const { result } = renderHook(() => useApi());

    // Trigger an error
    await act(async () => {
      try {
        await result.current.apiCall('/test-endpoint');
      } catch {
        // Expected error
      }
    });

    expect(result.current.error).toBe('Test error');

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  test('should handle 204 No Content response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    });

    const { result } = renderHook(() => useApi());

    let apiResult;
    await act(async () => {
      apiResult = await result.current.apiCall('/test-endpoint');
    });

    expect(apiResult).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should handle empty response with content-length 0', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('0'),
      },
    });

    const { result } = renderHook(() => useApi());

    let apiResult;
    await act(async () => {
      apiResult = await result.current.apiCall('/test-endpoint');
    });

    expect(apiResult).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should handle error response without JSON body', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      try {
        await result.current.apiCall('/test-endpoint');
      } catch (error) {
        expect(error.message).toBe('HTTP error! status: 500');
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('HTTP error! status: 500');
  });

  test('should set loading state during API call', async () => {
    let resolvePromise;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    fetch.mockReturnValueOnce(promise);

    const { result } = renderHook(() => useApi());

    // Start API call
    act(() => {
      result.current.apiCall('/test-endpoint');
    });

    expect(result.current.loading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    expect(result.current.loading).toBe(false);
  });
});

describe('useSplitApi Hook', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with correct methods', () => {
    const { result } = renderHook(() => useSplitApi());

    expect(typeof result.current.createSplit).toBe('function');
    expect(typeof result.current.getSplit).toBe('function');
    expect(typeof result.current.addParticipant).toBe('function');
    expect(typeof result.current.addExpense).toBe('function');
    expect(typeof result.current.deleteExpense).toBe('function');
    expect(typeof result.current.markParticipantDone).toBe('function');
    expect(typeof result.current.resetParticipant).toBe('function');
    expect(typeof result.current.getSettlement).toBe('function');
  });

  test('should create split', async () => {
    const mockResponse = { id: 'test-split-id' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useSplitApi());

    let splitResult;
    await act(async () => {
      splitResult = await result.current.createSplit();
    });

    expect(fetch).toHaveBeenCalledWith('/api/splits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(splitResult).toEqual(mockResponse);
  });

  test('should get split', async () => {
    const mockSplit = {
      id: 'test-split-id',
      participants: [],
      expenses: [],
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSplit,
    });

    const { result } = renderHook(() => useSplitApi());

    let splitResult;
    await act(async () => {
      splitResult = await result.current.getSplit('test-split-id');
    });

    expect(fetch).toHaveBeenCalledWith('/api/splits/test-split-id', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(splitResult).toEqual(mockSplit);
  });

  test('should add participant', async () => {
    const mockParticipant = {
      id: 'participant-id',
      name: 'John Doe',
      isDone: false,
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockParticipant,
    });

    const { result } = renderHook(() => useSplitApi());

    let participantResult;
    await act(async () => {
      participantResult = await result.current.addParticipant(
        'split-id',
        'John Doe'
      );
    });

    expect(fetch).toHaveBeenCalledWith('/api/splits/split-id/participants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'John Doe' }),
    });
    expect(participantResult).toEqual(mockParticipant);
  });

  test('should add expense', async () => {
    const mockExpense = {
      id: 'expense-id',
      participantId: 'participant-id',
      description: 'Dinner',
      amount: 25.5,
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExpense,
    });

    const { result } = renderHook(() => useSplitApi());

    let expenseResult;
    await act(async () => {
      expenseResult = await result.current.addExpense(
        'split-id',
        'participant-id',
        'Dinner',
        '25.50'
      );
    });

    expect(fetch).toHaveBeenCalledWith('/api/splits/split-id/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantId: 'participant-id',
        description: 'Dinner',
        amount: 25.5,
      }),
    });
    expect(expenseResult).toEqual(mockExpense);
  });

  test('should delete expense', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    });

    const { result } = renderHook(() => useSplitApi());

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deleteExpense('split-id', 'expense-id');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/splits/split-id/expenses/expense-id',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    expect(deleteResult).toBe(null);
  });

  test('should mark participant done', async () => {
    const mockParticipant = {
      id: 'participant-id',
      name: 'John Doe',
      isDone: true,
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockParticipant,
    });

    const { result } = renderHook(() => useSplitApi());

    let participantResult;
    await act(async () => {
      participantResult = await result.current.markParticipantDone(
        'split-id',
        'participant-id'
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/splits/split-id/participants/participant-id/done',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    expect(participantResult).toEqual(mockParticipant);
  });

  test('should reset participant', async () => {
    const mockParticipant = {
      id: 'participant-id',
      name: 'John Doe',
      isDone: false,
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockParticipant,
    });

    const { result } = renderHook(() => useSplitApi());

    let participantResult;
    await act(async () => {
      participantResult = await result.current.resetParticipant(
        'split-id',
        'participant-id'
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/splits/split-id/participants/participant-id/reset',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    expect(participantResult).toEqual(mockParticipant);
  });

  test('should get settlement', async () => {
    const mockSettlement = {
      ready: true,
      total: 100.0,
      perPerson: 50.0,
      balances: [],
      transactions: [],
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettlement,
    });

    const { result } = renderHook(() => useSplitApi());

    let settlementResult;
    await act(async () => {
      settlementResult = await result.current.getSettlement('split-id');
    });

    expect(fetch).toHaveBeenCalledWith('/api/splits/split-id/settlement', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(settlementResult).toEqual(mockSettlement);
  });
});
