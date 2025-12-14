import { useCallback, useState } from 'react';

// API base URL - uses environment variable in production, relative path in development
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

// Custom hook for API operations following React rules
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response body is not JSON, use the default error message
        }
        throw new Error(errorMessage);
      }

      // Skip JSON parsing for 204 No Content or empty responses
      if (
        response.status === 204 ||
        response.headers?.get('content-length') === '0'
      ) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    apiCall,
    clearError,
  };
};

// Custom hook for split operations
export const useSplitApi = () => {
  const { apiCall, loading, error, clearError } = useApi();

  const createSplit = useCallback(async () => {
    return apiCall(`${API_BASE_URL}/splits`, { method: 'POST' });
  }, [apiCall]);

  const getSplit = useCallback(
    async id => {
      return apiCall(`${API_BASE_URL}/splits/${id}`);
    },
    [apiCall]
  );

  const addParticipant = useCallback(
    async (splitId, name) => {
      return apiCall(`${API_BASE_URL}/splits/${splitId}/participants`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },
    [apiCall]
  );

  const addExpense = useCallback(
    async (splitId, participantId, description, amount) => {
      return apiCall(`${API_BASE_URL}/splits/${splitId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          participantId,
          description,
          amount: parseFloat(amount),
        }),
      });
    },
    [apiCall]
  );

  const deleteExpense = useCallback(
    async (splitId, expenseId) => {
      return apiCall(`${API_BASE_URL}/splits/${splitId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
    },
    [apiCall]
  );

  const markParticipantDone = useCallback(
    async (splitId, participantId) => {
      return apiCall(
        `${API_BASE_URL}/splits/${splitId}/participants/${participantId}/done`,
        {
          method: 'PATCH',
        }
      );
    },
    [apiCall]
  );

  const resetParticipant = useCallback(
    async (splitId, participantId) => {
      return apiCall(
        `${API_BASE_URL}/splits/${splitId}/participants/${participantId}/reset`,
        {
          method: 'PATCH',
        }
      );
    },
    [apiCall]
  );

  const getSettlement = useCallback(
    async splitId => {
      return apiCall(`${API_BASE_URL}/splits/${splitId}/settlement`);
    },
    [apiCall]
  );

  return {
    loading,
    error,
    clearError,
    createSplit,
    getSplit,
    addParticipant,
    addExpense,
    deleteExpense,
    markParticipantDone,
    resetParticipant,
    getSettlement,
  };
};
