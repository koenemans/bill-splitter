import { useCallback, useState } from 'react';

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
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
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
    return apiCall('/api/splits', { method: 'POST' });
  }, [apiCall]);

  const getSplit = useCallback(async (id) => {
    return apiCall(`/api/splits/${id}`);
  }, [apiCall]);

  const addParticipant = useCallback(async (splitId, name) => {
    return apiCall(`/api/splits/${splitId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }, [apiCall]);

  const addExpense = useCallback(async (splitId, participantId, description, amount) => {
    return apiCall(`/api/splits/${splitId}/expenses`, {
      method: 'POST',
      body: JSON.stringify({
        participantId,
        description,
        amount: parseFloat(amount),
      }),
    });
  }, [apiCall]);

  const deleteExpense = useCallback(async (splitId, expenseId) => {
    return apiCall(`/api/splits/${splitId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }, [apiCall]);

  const markParticipantDone = useCallback(async (splitId, participantId) => {
    return apiCall(`/api/splits/${splitId}/participants/${participantId}/done`, {
      method: 'PATCH',
    });
  }, [apiCall]);

  const resetParticipant = useCallback(async (splitId, participantId) => {
    return apiCall(`/api/splits/${splitId}/participants/${participantId}/reset`, {
      method: 'PATCH',
    });
  }, [apiCall]);

  const getSettlement = useCallback(async (splitId) => {
    return apiCall(`/api/splits/${splitId}/settlement`);
  }, [apiCall]);

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
