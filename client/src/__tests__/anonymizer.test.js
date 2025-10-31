import {
  anonymizeExpenseDescription,
  anonymizeParticipantName,
  anonymizeValue,
  clearAnonymizationCache,
  getCacheStats,
} from '../utils/anonymizer.js';

describe('Client Anonymizer Utilities', () => {
  beforeEach(() => {
    clearAnonymizationCache();
  });

  describe('anonymizeParticipantName', () => {
    test('should anonymize participant names consistently', () => {
      const name = 'Jane Smith';
      const anonymized1 = anonymizeParticipantName(name);
      const anonymized2 = anonymizeParticipantName(name);

      expect(anonymized1).toBe(anonymized2);
      expect(anonymized1).toMatch(/^anon_[a-f0-9]{1,8}$/);
      expect(anonymized1).not.toBe(name);
    });

    test('should handle empty or invalid names', () => {
      expect(anonymizeParticipantName('')).toBe('[INVALID]');
      expect(anonymizeParticipantName(null)).toBe('[INVALID]');
      expect(anonymizeParticipantName(undefined)).toBe('[INVALID]');
    });

    test('should produce different hashes for different names', () => {
      const name1 = 'Alice';
      const name2 = 'Bob';

      const anonymized1 = anonymizeParticipantName(name1);
      const anonymized2 = anonymizeParticipantName(name2);

      expect(anonymized1).not.toBe(anonymized2);
    });
  });

  describe('anonymizeExpenseDescription', () => {
    test('should anonymize descriptions with length info', () => {
      const description = 'Coffee and pastries';
      const anonymized = anonymizeExpenseDescription(description);

      expect(anonymized).toMatch(/^anon_[a-f0-9]{1,8}_len\d+$/);
      expect(anonymized).toContain(`_len${description.length}`);
      expect(anonymized).not.toBe(description);
    });

    test('should handle empty descriptions', () => {
      expect(anonymizeExpenseDescription('')).toBe('[INVALID_DESC]');
      expect(anonymizeExpenseDescription(null)).toBe('[INVALID_DESC]');
    });

    test('should preserve length information', () => {
      const shortDesc = 'Tea';
      const longDesc =
        'Very expensive dinner at a fancy restaurant with multiple courses';

      const shortAnon = anonymizeExpenseDescription(shortDesc);
      const longAnon = anonymizeExpenseDescription(longDesc);

      expect(shortAnon).toContain('_len3');
      expect(longAnon).toContain(`_len${longDesc.length}`);
    });
  });

  describe('anonymizeValue', () => {
    test('should anonymize generic values with custom type', () => {
      const value = 'sensitive information';
      const anonymized = anonymizeValue(value, 'custom');

      expect(anonymized).toMatch(/^anon_[a-f0-9]{1,8}$/);
      expect(anonymized).not.toBe(value);
    });

    test('should use different salts for different types', () => {
      const value = 'same value';
      const type1Anon = anonymizeValue(value, 'type1');
      const type2Anon = anonymizeValue(value, 'type2');

      expect(type1Anon).not.toBe(type2Anon);
    });
  });

  describe('cache functionality', () => {
    test('should maintain cache consistency', () => {
      const name = 'Test User';

      // First call
      const result1 = anonymizeParticipantName(name);
      const stats1 = getCacheStats();

      // Second call should use cache
      const result2 = anonymizeParticipantName(name);
      const stats2 = getCacheStats();

      expect(result1).toBe(result2);
      expect(stats1.size).toBe(1);
      expect(stats2.size).toBe(1); // Should not increase
    });

    test('should clear cache properly', () => {
      anonymizeParticipantName('Test');
      expect(getCacheStats().size).toBe(1);

      clearAnonymizationCache();
      expect(getCacheStats().size).toBe(0);
    });

    test('should handle multiple different values in cache', () => {
      anonymizeParticipantName('User1');
      anonymizeParticipantName('User2');
      anonymizeExpenseDescription('Expense1');

      const stats = getCacheStats();
      expect(stats.size).toBe(3);
    });
  });

  describe('client-side hash function', () => {
    test('should produce consistent hashes', () => {
      const value = 'test string';
      const hash1 = anonymizeValue(value);
      const hash2 = anonymizeValue(value);

      expect(hash1).toBe(hash2);
    });

    test('should handle special characters', () => {
      const specialValue = 'Café & Bakery - 50% off!';
      const anonymized = anonymizeValue(specialValue);

      expect(anonymized).toMatch(/^anon_[a-f0-9]{1,8}$/);
      expect(anonymized).not.toBe(specialValue);
    });

    test('should handle unicode characters', () => {
      const unicodeValue = '🍕 Pizza & 🍺 Beer';
      const anonymized = anonymizeValue(unicodeValue);

      expect(anonymized).toMatch(/^anon_[a-f0-9]{1,8}$/);
      expect(anonymized).not.toBe(unicodeValue);
    });
  });
});
