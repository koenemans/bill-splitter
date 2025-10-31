import { renderHook } from '@testing-library/react';
import {
  describe,
  expect,
  test,
} from '@jest/globals';
import { useSplit } from '../useSplit';

describe('useSplit Hook - Basic Tests', () => {
  test('should initialize with correct default state when no splitId provided', () => {
    const { result } = renderHook(() => useSplit(null));

    expect(result.current.split).toBe(null);
    expect(result.current.settlement).toBe(null);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.refreshSplit).toBe('function');
    expect(typeof result.current.loadSettlement).toBe('function');
  });

  test('should provide all required hook methods', () => {
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
  });

  test('should handle refreshSplit call without errors', () => {
    const { result } = renderHook(() => useSplit('test-id'));

    expect(() => {
      result.current.refreshSplit();
    }).not.toThrow();
  });

  test('should handle loadSettlement call without errors', async () => {
    const { result } = renderHook(() => useSplit('test-id'));

    await expect(async () => {
      await result.current.loadSettlement();
    }).not.toThrow();
  });
});
