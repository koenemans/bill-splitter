import { useCallback, useEffect, useState } from 'react';

// Custom hook for participant management following React rules
export const useParticipant = splitId => {
  const [currentParticipant, setCurrentParticipant] = useState(null);

  const storageKey = `bill-splitter-participant-${splitId}`;

  // Load participant from localStorage on mount
  useEffect(() => {
    if (splitId) {
      const savedParticipantId = localStorage.getItem(storageKey);
      if (savedParticipantId) {
        // Note: savedParticipantId is available but not used in this effect
        // It's meant to be used by parent component via restoreParticipant
      }
    }
  }, [splitId, storageKey]);

  // Save participant to localStorage
  const saveParticipant = useCallback(
    participant => {
      if (participant && splitId) {
        localStorage.setItem(storageKey, participant.id);
        setCurrentParticipant(participant);
      }
    },
    [splitId, storageKey]
  );

  // Clear participant from localStorage
  const clearParticipant = useCallback(() => {
    if (splitId) {
      localStorage.removeItem(storageKey);
      setCurrentParticipant(null);
    }
  }, [splitId, storageKey]);

  // Restore participant from split data
  const restoreParticipant = useCallback(
    split => {
      if (!split || currentParticipant) {
        return;
      }

      const savedParticipantId = localStorage.getItem(storageKey);
      if (savedParticipantId) {
        const participant = split.participants.find(
          p => p.id === savedParticipantId
        );

        if (participant && !participant.isDone) {
          setCurrentParticipant(participant);
        } else if (!participant || participant.isDone) {
          // Clear localStorage if participant doesn't exist or is done
          clearParticipant();
        }
      }
    },
    [currentParticipant, storageKey, clearParticipant]
  );

  return {
    currentParticipant,
    setCurrentParticipant,
    saveParticipant,
    clearParticipant,
    restoreParticipant,
  };
};
