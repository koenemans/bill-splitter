import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Create mock functions
const mockFn = () => {
  const fn = () => fn;
  fn.mockImplementation = impl => {
    fn.impl = impl;
    return fn;
  };
  fn.mockReturnValue = value => {
    fn.returnValue = value;
    return fn;
  };
  fn.mockResolvedValue = value => {
    fn.resolvedValue = value;
    return fn;
  };
  fn.mockRejectedValue = value => {
    fn.rejectedValue = value;
    return fn;
  };
  return fn;
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockFn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: mockFn(),
    removeListener: mockFn(),
    addEventListener: mockFn(),
    removeEventListener: mockFn(),
    dispatchEvent: mockFn(),
  })),
});

// Mock window.location (jsdom already provides this)
