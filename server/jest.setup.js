/**
 * Jest setup file to provide globals available in Cloudflare Workers
 * This ensures tests can run with the same globals as the Workers runtime
 */

import { webcrypto } from 'node:crypto';

// Polyfill global crypto for Node.js test environment
// In Cloudflare Workers, crypto is a global (Web Crypto API)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}
