/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../src/pages/Home.jsx';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock fetch
global.fetch = jest.fn();

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  test('renders home page with title and button', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Bill Splitter')).toBeInTheDocument();
    expect(screen.getByText('Split bills easily with your friends. No signup required.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Split/i })).toBeInTheDocument();
  });

  test('displays all instruction steps', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText('Create a split')).toBeInTheDocument();
    expect(screen.getByText('Share the link')).toBeInTheDocument();
    expect(screen.getByText('Add expenses')).toBeInTheDocument();
    expect(screen.getByText('Get the results')).toBeInTheDocument();
  });

  test('creates a split and navigates on button click', async () => {
    const mockSplitId = 'test-split-id';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: mockSplitId }),
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: /Create New Split/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(mockNavigate).toHaveBeenCalledWith(`/split/${mockSplitId}`);
    });
  });

  test('shows loading state while creating split', async () => {
    global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: /Create New Split/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  test('handles error when creating split fails', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: /Create New Split/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Server error');
    });

    alertMock.mockRestore();
  });

  test('handles network error', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: /Create New Split/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Failed to create split. Please check your connection and try again.');
    });

    alertMock.mockRestore();
  });
});
