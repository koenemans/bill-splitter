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
