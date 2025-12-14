import { describe, expect, test } from '@jest/globals';
import { sanitizeInput } from '../utils/sanitize.js';

describe('sanitizeInput', () => {
  test('should escape HTML special characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeInput(input);
    expect(result).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  test('should escape ampersands', () => {
    const input = 'Tom & Jerry';
    const result = sanitizeInput(input);
    expect(result).toBe('Tom &amp; Jerry');
  });

  test('should escape single quotes', () => {
    const input = "It's a test";
    const result = sanitizeInput(input);
    expect(result).toBe('It&#x27;s a test');
  });

  test('should trim whitespace', () => {
    const input = '  Hello World  ';
    const result = sanitizeInput(input);
    expect(result).toBe('Hello World');
  });

  test('should return non-string values unchanged', () => {
    expect(sanitizeInput(123)).toBe(123);
    expect(sanitizeInput(null)).toBe(null);
    expect(sanitizeInput(undefined)).toBe(undefined);
  });

  test('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  test('should handle normal text without modification', () => {
    const input = 'Normal text without special chars';
    const result = sanitizeInput(input);
    expect(result).toBe('Normal text without special chars');
  });
});
