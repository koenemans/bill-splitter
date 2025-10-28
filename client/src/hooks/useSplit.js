import { useCallback, useEffect, useState } from 'react';
import { useSplitApi } from './useApi';
import { logger } from '../utils/logger';

// Custom hook for split data management with polling following React rules
export const useSplit = splitId => {
  const [split, setSplit] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getSplit, getSettlement, error } = useSplitApi();

  // Load split data
  const loadSplit = useCallback(async () => {
    if (!splitId) {
      return;
    }

    try {
      const data = await getSplit(splitId);
      setSplit(data);
    } catch (err) {
      if (
        err.message.includes('404') ||
        err.message.includes('Split not found')
      ) {
        setSplit(null);
      }
      logger.apiError('load_split', err, { splitId });
    } finally {
      setLoading(false);
    }
  }, [splitId, getSplit]);

  // Load settlement data
  const loadSettlement = useCallback(async () => {
    if (!splitId) {
      return;
    }

    try {
      const data = await getSettlement(splitId);
      if (data.ready) {
        setSettlement(data);
      }
    } catch (err) {
      logger.apiError('load_settlement', err, { splitId });
    }
  }, [splitId, getSettlement]);

  // Check if all participants are done and load settlement
  useEffect(() => {
    if (
      split &&
      split.participants.length > 0 &&
      split.participants.every(p => p.isDone)
    ) {
      loadSettlement();
    } else {
      setSettlement(null);
    }
  }, [split, loadSettlement]);

  // Initial load and polling setup
  useEffect(() => {
    if (!splitId) {
      return;
    }

    loadSplit();

    // Security: Reduced polling frequency to minimize server load (5 seconds)
    const interval = setInterval(loadSplit, 5000);

    return () => clearInterval(interval);
  }, [splitId, loadSplit]);

  // Refresh split data (useful after mutations)
  const refreshSplit = useCallback(() => {
    loadSplit();
  }, [loadSplit]);

  return {
    split,
    settlement,
    loading,
    error,
    refreshSplit,
    loadSettlement,
  };
};
