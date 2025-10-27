/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Split from '../src/pages/Split.jsx';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const renderSplit = (splitId = 'test-split-id') => {
  return render(
    <MemoryRouter initialEntries={[`/split/${splitId}`]}>
      <Routes>
        <Route path="/split/:id" element={<Split />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Split Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    localStorageMock.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockSplitData = {
    id: 'test-split-id',
    createdAt: new Date().toISOString(),
    participants: [],
    expenses: [],
  };

  test('renders loading state initially', () => {
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));

    renderSplit();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders split not found for invalid split', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByText('Split not found')).toBeInTheDocument();
    });
  });

  test('renders split page with share link', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSplitData,
    });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByText('Bill Split')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/\/split\/test-split-id/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
    });
  });

  test('copies link to clipboard', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSplitData,
    });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /Copy Link/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('Link copied to clipboard!');

    alertMock.mockRestore();
  });

  test('shows join form when no current participant', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSplitData,
    });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByText('Join the Split')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Join/i })).toBeInTheDocument();
    });
  });

  test('adds a participant', async () => {
    const mockParticipant = {
      id: 'participant-1',
      name: 'Alice',
      isDone: false,
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSplitData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockParticipant,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSplitData,
          participants: [mockParticipant],
        }),
      });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter your name');
    const joinButton = screen.getByRole('button', { name: /Join/i });

    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/splits/test-split-id/participants',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Alice' }),
        })
      );
    });
  });

  test('displays participant expenses form after joining', async () => {
    const mockParticipant = {
      id: 'participant-1',
      name: 'Alice',
      isDone: false,
    };

    const splitWithParticipant = {
      ...mockSplitData,
      participants: [mockParticipant],
    };

    // Initial load
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSplitData,
    });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    // Mock for adding participant
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockParticipant,
    });
    
    // Mock for loadSplit after adding participant
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => splitWithParticipant,
    });

    const nameInput = screen.getByPlaceholderText('Enter your name');
    const joinButton = screen.getByRole('button', { name: /Join/i });

    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(screen.getByText(/Alice's Expenses/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I'm Done Adding Expenses/i })).toBeInTheDocument();
  });

  test('adds an expense', async () => {
    const mockParticipant = {
      id: 'participant-1',
      name: 'Alice',
      isDone: false,
    };

    const mockExpense = {
      id: 'expense-1',
      participantId: 'participant-1',
      description: 'Dinner',
      amount: 50,
    };

    const splitWithParticipant = {
      ...mockSplitData,
      participants: [mockParticipant],
      expenses: [],
    };

    const splitWithExpense = {
      ...mockSplitData,
      participants: [mockParticipant],
      expenses: [mockExpense],
    };

    // Set localStorage to simulate returning user
    localStorageMock.setItem('bill-splitter-participant-test-split-id', 'participant-1');

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitWithParticipant,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpense,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitWithExpense,
      });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByText("Alice's Expenses")).toBeInTheDocument();
    });

    const descriptionInput = screen.getByPlaceholderText('Description');
    const amountInput = screen.getByPlaceholderText('0.00');
    const addButton = screen.getByRole('button', { name: /Add Expense/i });

    fireEvent.change(descriptionInput, { target: { value: 'Dinner' } });
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/splits/test-split-id/expenses',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            participantId: 'participant-1',
            description: 'Dinner',
            amount: 50,
          }),
        })
      );
    });
  });

  test('displays participants list', async () => {
    const splitWithParticipants = {
      ...mockSplitData,
      participants: [
        { id: '1', name: 'Alice', isDone: false },
        { id: '2', name: 'Bob', isDone: true },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => splitWithParticipants,
    });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByText('Participants')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Adding expenses...')).toBeInTheDocument();
      expect(screen.getByText('✓ Done')).toBeInTheDocument();
    });
  });

  test('marks participant as done', async () => {
    const mockParticipant = {
      id: 'participant-1',
      name: 'Alice',
      isDone: false,
    };

    const splitWithParticipant = {
      ...mockSplitData,
      participants: [mockParticipant],
    };

    const doneParticipant = { ...mockParticipant, isDone: true };

    localStorageMock.setItem('bill-splitter-participant-test-split-id', 'participant-1');

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitWithParticipant,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => doneParticipant,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...splitWithParticipant,
          participants: [doneParticipant],
        }),
      });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /I'm Done Adding Expenses/i })).toBeInTheDocument();
    });

    const doneButton = screen.getByRole('button', { name: /I'm Done Adding Expenses/i });
    fireEvent.click(doneButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/splits/test-split-id/participants/participant-1/done',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  test('displays settlement when all participants are done', async () => {
    const splitWithSettlement = {
      ...mockSplitData,
      participants: [
        { id: '1', name: 'Alice', isDone: true },
        { id: '2', name: 'Bob', isDone: true },
      ],
      expenses: [
        { id: 'e1', participantId: '1', description: 'Dinner', amount: 60 },
        { id: 'e2', participantId: '2', description: 'Drinks', amount: 40 },
      ],
    };

    const mockSettlement = {
      ready: true,
      total: 100,
      perPerson: 50,
      balances: [
        { name: 'Alice', paid: 60, owes: 50, balance: 10 },
        { name: 'Bob', paid: 40, owes: 50, balance: -10 },
      ],
      transactions: [
        { from: 'Bob', to: 'Alice', amount: 10 },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => splitWithSettlement,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettlement,
      });

    renderSplit();

    await waitFor(() => {
      expect(screen.getByText('Settlement')).toBeInTheDocument();
      expect(screen.getByText('€100.00')).toBeInTheDocument();
      expect(screen.getByText('€50.00')).toBeInTheDocument();
      expect(screen.getByText('Balances')).toBeInTheDocument();
      expect(screen.getByText('Who Pays Whom')).toBeInTheDocument();
    });
  });
});
