import { memo } from 'react';
import PropTypes from 'prop-types';

const ExpenseItem = memo(({ expense, onDelete }) => {
  return (
    <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
      <span className='font-medium text-gray-900'>{expense.description}</span>
      <div className='flex items-center gap-3'>
        <span className='font-semibold text-gray-900'>
          €{expense.amount.toFixed(2)}
        </span>
        <button
          onClick={() => onDelete(expense.id)}
          className='text-red-500 hover:text-red-700'
          aria-label='Delete expense'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
            />
          </svg>
        </button>
      </div>
    </div>
  );
});

ExpenseItem.displayName = 'ExpenseItem';

ExpenseItem.propTypes = {
  expense: PropTypes.shape({
    id: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ExpenseItem;
