import { TextDecoder, TextEncoder } from 'node:util';

// jsdom doesn't provide TextEncoder/TextDecoder, which react-router v7 needs
Object.assign(globalThis, { TextEncoder, TextDecoder });

// Mock import.meta for Jest environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: false,
        MODE: 'test',
        VITE_API_BASE_URL: undefined,
      },
    },
  },
  writable: true,
});
