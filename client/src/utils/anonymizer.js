/**
 * Client-side anonymization utilities for logging
 * Ensures no personal information is exposed in client logs
 */

/**
 * Creates a simple hash for anonymization (client-side compatible)
 * @param {string} value - The value to anonymize
 * @param {string} salt - Optional salt for hashing
 * @returns {string} - Anonymized hash
 */
const createAnonymousHash = (value, salt = 'bill-splitter-client') => {
  if (!value || typeof value !== 'string') {
    return '[INVALID]';
  }

  // Simple deterministic hash implementation for client-side (no crypto module)
  // No cache needed since the hash function is deterministic
  let hash = 0;
  const input = `${salt}:${value}`;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `anon_${Math.abs(hash).toString(16).substring(0, 8)}`;
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
 * Anonymizes any string value for logging
 * @param {string} value - Value to anonymize
 * @param {string} type - Type of value for salt
 * @returns {string} - Anonymized value
 */
export const anonymizeValue = (value, type = 'generic') => {
  return createAnonymousHash(value, type);
};
