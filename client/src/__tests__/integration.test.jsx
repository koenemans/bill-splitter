import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import App from '../App';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock alert
global.alert = jest.fn();

// Helper function to render app with router
const renderApp = (initialRoute = '/') => {
  window.history.pushState({}, 'Test page', initialRoute);

  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('Bill Splitter Integration Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    navigator.clipboard.writeText.mockClear();
    global.alert.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Home Page Flow', () => {
    test('should render home page and create new split', async () => {
      // Mock successful split creation
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-split-id' }),
      });

      renderApp('/');

      // Check home page elements
      expect(screen.getByText('Bill Splitter')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Split bills easily with your friends. No signup required.'
        )
      ).toBeInTheDocument();

      const createButton = screen.getByText('Create New Split');
      expect(createButton).toBeInTheDocument();

      // Click create button
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/splits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });
    });

    test('should handle create split error', async () => {
      // Mock failed split creation
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      renderApp('/');

      const createButton = screen.getByText('Create New Split');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Server error');
      });
    });
  });

  describe('Split Page Flow', () => {
    const mockSplitId = 'test-split-id';
    const mockSplit = {
      id: mockSplitId,
      createdAt: '2023-01-01T00:00:00.000Z',
      participants: [],
      expenses: [],
    };

    test('should render split page and show loading state', async () => {
      // Mock split loading with delay
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      fetch.mockReturnValueOnce(promise);

      renderApp(`/split/${mockSplitId}`);

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Resolve the promise
      await waitFor(async () => {
        resolvePromise({
          ok: true,
          json: async () => mockSplit,
        });
      });
    });

    test('should handle split not found', async () => {
      // Mock 404 response
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Split not found' }),
      });

      renderApp(`/split/${mockSplitId}`);

      await waitFor(() => {
        expect(screen.getByText('Split not found')).toBeInTheDocument();
      });
    });

    test('should handle copy link functionality', async () => {
      // Mock split load
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSplit,
      });

      renderApp(`/split/${mockSplitId}`);

      await waitFor(() => {
        expect(screen.getByText('Copy Link')).toBeInTheDocument();
      });

      const copyButton = screen.getByText('Copy Link');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/split/${mockSplitId}`
      );
      expect(global.alert).toHaveBeenCalledWith('Link copied to clipboard!');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      renderApp('/');

      const createButton = screen.getByText('Create New Split');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Network error');
      });
    });
  });
});
