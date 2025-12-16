import { memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ParticipantCard = memo(({ participant, onReset }) => {
  const { t } = useTranslation();

  return (
    <div
      className={`p-3 sm:p-4 rounded-lg border-2 ${
        participant.isDone
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className='font-medium text-gray-900 text-sm sm:text-base truncate'>
        {participant.name}
      </div>
      <div className='text-xs sm:text-sm text-gray-600 mt-1'>
        {participant.isDone
          ? t('participant.done')
          : t('participant.addingExpenses')}
      </div>
      {participant.isDone && (
        <button
          onClick={() => onReset(participant.id)}
          className='mt-2 w-full text-xs sm:text-sm px-2 py-1 sm:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors touch-manipulation'
        >
          {t('participant.reset')}
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
