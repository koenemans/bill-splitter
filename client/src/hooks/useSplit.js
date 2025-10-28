import { useCallback, useEffect, useRef, useState } from 'react';
import { useSplitApi } from './useApi';
import { logger } from '../utils/logger';

// Custom hook for split data management with polling following React rules
export const useSplit = splitId => {
  const [split, setSplit] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(10000); // Start with 10 seconds
  const consecutiveErrorsRef = useRef(0);
  const { getSplit, getSettlement, error } = useSplitApi();

  // Load split data with exponential backoff on rate limit errors
  const loadSplit = useCallback(async () => {
    if (!splitId) {
      return;
    }

    try {
      const data = await getSplit(splitId);
      setSplit(data);

      // Reset error count and polling interval on successful request
      consecutiveErrorsRef.current = 0;
      setPollingInterval(10000); // Reset to 10 seconds
    } catch (err) {
      if (
        err.message.includes('404') ||
        err.message.includes('Split not found')
      ) {
        setSplit(null);
      } else if (
        err.message.includes('429') ||
        err.message.includes('Too many')
      ) {
        // Exponential backoff for rate limit errors
        consecutiveErrorsRef.current += 1;
        const backoffInterval = Math.min(
          10000 * Math.pow(2, consecutiveErrorsRef.current),
          60000
        ); // Max 1 minute
        setPollingInterval(backoffInterval);

        logger.apiError('load_split_rate_limited', err, {
          splitId,
          consecutiveErrors: consecutiveErrorsRef.current,
          newInterval: backoffInterval,
        });
      } else {
        logger.apiError('load_split', err, { splitId });
      }
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

  // Initial load and adaptive polling setup
  useEffect(() => {
    if (!splitId) {
      return;
    }

    loadSplit();

    // Adaptive polling with exponential backoff on errors
    const interval = setInterval(loadSplit, pollingInterval);

    return () => clearInterval(interval);
  }, [splitId, loadSplit, pollingInterval]);

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
