import {
  anonymizeExpenseDescription,
  anonymizeIpAddress,
  anonymizeParticipantName,
  anonymizeQueryParams,
  anonymizeUserAgent,
} from '../utils/anonymizer.js';

describe('Anonymizer Utilities', () => {
  describe('anonymizeParticipantName', () => {
    test('should anonymize participant names consistently', () => {
      const name = 'John Doe';
      const anonymized1 = anonymizeParticipantName(name);
      const anonymized2 = anonymizeParticipantName(name);

      expect(anonymized1).toBe(anonymized2);
      expect(anonymized1).toMatch(/^anon_[a-f0-9]{8}$/);
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
      const description = 'Dinner at restaurant';
      const anonymized = anonymizeExpenseDescription(description);

      expect(anonymized).toMatch(/^anon_[a-f0-9]{8}_len\d+$/);
      expect(anonymized).toContain(`_len${description.length}`);
      expect(anonymized).not.toBe(description);
    });

    test('should handle empty descriptions', () => {
      expect(anonymizeExpenseDescription('')).toBe('[INVALID_DESC]');
      expect(anonymizeExpenseDescription(null)).toBe('[INVALID_DESC]');
    });
  });

  describe('anonymizeIpAddress', () => {
    test('should anonymize IPv4 addresses partially', () => {
      const ip = '192.168.1.100';
      const anonymized = anonymizeIpAddress(ip);

      expect(anonymized).toBe('192.168.xxx.xxx');
    });

    test('should handle IPv6 and other formats with hash', () => {
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const anonymized = anonymizeIpAddress(ipv6);

      expect(anonymized).toMatch(/^anon_[a-f0-9]{8}$/);
    });

    test('should handle invalid IPs', () => {
      expect(anonymizeIpAddress('')).toBe('[NO_IP]');
      expect(anonymizeIpAddress(null)).toBe('[NO_IP]');
    });
  });

  describe('anonymizeUserAgent', () => {
    test('should extract browser and platform info', () => {
      const chromeUA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const anonymized = anonymizeUserAgent(chromeUA);

      expect(anonymized).toBe('Chrome/Windows');
    });

    test('should handle Safari user agent', () => {
      const safariUA =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      const anonymized = anonymizeUserAgent(safariUA);

      expect(anonymized).toBe('Safari/Mac');
    });

    test('should handle Firefox user agent', () => {
      const firefoxUA =
        'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0';
      const anonymized = anonymizeUserAgent(firefoxUA);

      expect(anonymized).toBe('Firefox/Linux');
    });

    test('should handle invalid user agents', () => {
      expect(anonymizeUserAgent('')).toBe('[NO_UA]');
      expect(anonymizeUserAgent(null)).toBe('[NO_UA]');
    });
  });

  describe('anonymizeQueryParams', () => {
    test('should anonymize query parameter values', () => {
      const query = {
        search: 'sensitive data',
        filter: 'personal info',
        empty: '',
      };

      const anonymized = anonymizeQueryParams(query);

      expect(anonymized.search).toMatch(/^anon_[a-f0-9]{8}$/);
      expect(anonymized.filter).toMatch(/^anon_[a-f0-9]{8}$/);
      expect(anonymized.empty).toBe('[EMPTY]');
      expect(anonymized.search).not.toBe('sensitive data');
    });

    test('should handle invalid query objects', () => {
      expect(anonymizeQueryParams(null)).toEqual({});
      expect(anonymizeQueryParams(undefined)).toEqual({});
    });
  });
});
