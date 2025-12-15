import { Fragment, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const SettlementDisplay = memo(({ settlement }) => {
  const { t } = useTranslation();

  if (!settlement) {
    return null;
  }

  return (
    <div className='bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6'>
      <h2 className='text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4'>
        {t('settlement.title')}
      </h2>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6'>
        <div className='bg-blue-50 rounded-lg p-3 sm:p-4'>
          <div className='text-xs sm:text-sm text-gray-600'>
            {t('settlement.totalAmount')}
          </div>
          <div className='text-xl sm:text-2xl font-bold text-gray-900'>
            €{settlement.total.toFixed(2)}
          </div>
        </div>
        <div className='bg-indigo-50 rounded-lg p-3 sm:p-4'>
          <div className='text-xs sm:text-sm text-gray-600'>
            {t('settlement.perPerson')}
          </div>
          <div className='text-xl sm:text-2xl font-bold text-gray-900'>
            €{settlement.perPerson.toFixed(2)}
          </div>
        </div>
      </div>

      <h3 className='text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3'>
        {t('settlement.balances')}
      </h3>
      <div className='space-y-2 mb-4 sm:mb-6'>
        {settlement.balances.map((balance, idx) => (
          <div
            key={`${balance.name}-${idx}`}
            className='flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg gap-1 sm:gap-0'
          >
            <span className='font-medium text-sm sm:text-base'>
              {balance.name}
            </span>
            <div className='text-left sm:text-right'>
              <div className='text-xs sm:text-sm text-gray-600'>
                {t('settlement.paid', { amount: balance.paid.toFixed(2) })} |{' '}
                {t('settlement.owes', { amount: balance.owes.toFixed(2) })}
              </div>
              <div
                className={`font-semibold text-sm sm:text-base ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {balance.balance >= 0 ? '+' : ''}€{balance.balance.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {settlement.transactions.length > 0 && (
        <Fragment>
          <h3 className='text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3'>
            {t('settlement.whoPaysWhom')}
          </h3>
          <div className='space-y-2'>
            {settlement.transactions.map((tx, idx) => (
              <div
                key={`${tx.from}-${tx.to}-${idx}`}
                className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg gap-2 sm:gap-0'
              >
                <div className='flex items-center gap-2 sm:gap-3'>
                  <span className='font-medium text-gray-900 text-sm sm:text-base'>
                    {tx.from}
                  </span>
                  <svg
                    className='w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17 8l4 4m0 0l-4 4m4-4H3'
                    />
                  </svg>
                  <span className='font-medium text-gray-900 text-sm sm:text-base'>
                    {tx.to}
                  </span>
                </div>
                <span className='text-base sm:text-lg font-bold text-indigo-600 self-start sm:self-auto'>
                  €{tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Fragment>
      )}
    </div>
  );
});

SettlementDisplay.displayName = 'SettlementDisplay';

SettlementDisplay.propTypes = {
  settlement: PropTypes.shape({
    total: PropTypes.number.isRequired,
    perPerson: PropTypes.number.isRequired,
    balances: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        paid: PropTypes.number.isRequired,
        owes: PropTypes.number.isRequired,
        balance: PropTypes.number.isRequired,
      })
    ).isRequired,
    transactions: PropTypes.arrayOf(
      PropTypes.shape({
        from: PropTypes.string.isRequired,
        to: PropTypes.string.isRequired,
        amount: PropTypes.number.isRequired,
      })
    ).isRequired,
  }),
};

export default SettlementDisplay;
