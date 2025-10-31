import crypto from 'crypto';

/**
 * Anonymization utilities for logging
 * Ensures no personal information is exposed in logs
 */

/**
 * Creates a consistent hash for anonymization
 * @param {string} value - The value to anonymize
 * @param {string} salt - Optional salt for hashing
 * @returns {string} - Anonymized hash
 */
const createAnonymousHash = (value, salt = 'bill-splitter-log') => {
  if (!value || typeof value !== 'string') {
    return '[INVALID]';
  }

  // Create deterministic hash - no cache needed since crypto.createHash is deterministic
  const hash = crypto
    .createHash('sha256')
    .update(`${salt}:${value}`)
    .digest('hex')
    .substring(0, 8);

  return `anon_${hash}`;
};

/**
 * Anonymizes participant names
 * @param {string} name - Participant name
 * @returns {string} - Anonymized name
 */
export const anonymizeParticipantName = name => {
  return createAnonymousHash(name, 'participant');
};

/**
 * Anonymizes expense descriptions
 * @param {string} description - Expense description
 * @returns {string} - Anonymized description with preserved length info
 */
export const anonymizeExpenseDescription = description => {
  if (!description || typeof description !== 'string') {
    return '[INVALID_DESC]';
  }

  const length = description.length;
  const hash = createAnonymousHash(description, 'expense');
  return `${hash}_len${length}`;
};

/**
 * Anonymizes IP addresses
 * @param {string} ip - IP address
 * @returns {string} - Anonymized IP
 */
export const anonymizeIpAddress = ip => {
  if (!ip || typeof ip !== 'string') {
    return '[NO_IP]';
  }

  // For IPv4, keep first two octets, anonymize last two
  if (ip.includes('.') && ip.split('.').length === 4) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }

  // For IPv6 or other formats, use hash
  return createAnonymousHash(ip, 'ip');
};

/**
 * Anonymizes user agent strings
 * @param {string} userAgent - User agent string
 * @returns {string} - Anonymized user agent with basic browser info preserved
 */
export const anonymizeUserAgent = userAgent => {
  if (!userAgent || typeof userAgent !== 'string') {
    return '[NO_UA]';
  }

  // Extract basic browser info without personal details
  let browserInfo = 'Unknown';

  if (userAgent.includes('Chrome')) {
    browserInfo = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browserInfo = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserInfo = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browserInfo = 'Edge';
  }

  // Extract platform info without versions
  let platformInfo = 'Unknown';

  if (userAgent.includes('Windows')) {
    platformInfo = 'Windows';
  } else if (userAgent.includes('Mac')) {
    platformInfo = 'Mac';
  } else if (userAgent.includes('Linux')) {
    platformInfo = 'Linux';
  } else if (userAgent.includes('Android')) {
    platformInfo = 'Android';
  } else if (userAgent.includes('iOS')) {
    platformInfo = 'iOS';
  }

  return `${browserInfo}/${platformInfo}`;
};

/**
 * Anonymizes query parameters that might contain sensitive data
 * @param {Object} query - Query parameters object
 * @returns {Object} - Anonymized query parameters
 */
export const anonymizeQueryParams = query => {
  if (!query || typeof query !== 'object') {
    return {};
  }

  const anonymized = {};

  for (const [key, value] of Object.entries(query)) {
    // Keep non-sensitive parameter names, anonymize values
    if (typeof value === 'string' && value.length > 0) {
      anonymized[key] = createAnonymousHash(value, 'query');
    } else {
      anonymized[key] = '[EMPTY]';
    }
  }

  return anonymized;
};
