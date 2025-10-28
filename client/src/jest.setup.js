// Mock import.meta for Jest environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: false,
        MODE: 'test',
        VITE_APPLICATIONINSIGHTS_CONNECTION_STRING: undefined,
      },
    },
  },
  writable: true,
});
