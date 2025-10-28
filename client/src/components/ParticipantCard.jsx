import { memo } from 'react';
import PropTypes from 'prop-types';

const ParticipantCard = memo(({ participant, onReset }) => {
  return (
    <div
      className={`p-3 rounded-lg border-2 ${
        participant.isDone
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className='font-medium text-gray-900'>{participant.name}</div>
      <div className='text-xs text-gray-600'>
        {participant.isDone ? '✓ Done' : 'Adding expenses...'}
      </div>
      {participant.isDone && (
        <button
          onClick={() => onReset(participant.id)}
          className='mt-2 w-full text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
        >
          Reset
        </button>
      )}
    </div>
  );
});

ParticipantCard.displayName = 'ParticipantCard';

ParticipantCard.propTypes = {
  participant: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    isDone: PropTypes.bool.isRequired,
  }).isRequired,
  onReset: PropTypes.func.isRequired,
};

export default ParticipantCard;
