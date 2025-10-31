// Mock import.meta for Jest environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: false,
        MODE: 'test',
      },
    },
  },
  writable: true,
});
