import { Fragment, memo } from 'react'
import PropTypes from 'prop-types'

const SettlementDisplay = memo(({ settlement }) => {
  if (!settlement) {return null}

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Settlement</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900">€{settlement.total.toFixed(2)}</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Per Person</div>
          <div className="text-2xl font-bold text-gray-900">€{settlement.perPerson.toFixed(2)}</div>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-3">Balances</h3>
      <div className="space-y-2 mb-6">
        {settlement.balances.map((balance, idx) => (
          <div key={`${balance.name}-${idx}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">{balance.name}</span>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Paid: €{balance.paid.toFixed(2)} | Owes: €{balance.owes.toFixed(2)}
              </div>
              <div className={`font-semibold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance.balance >= 0 ? '+' : ''}€{balance.balance.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {settlement.transactions.length > 0 && (
        <Fragment>
          <h3 className="font-semibold text-gray-900 mb-3">Who Pays Whom</h3>
          <div className="space-y-2">
            {settlement.transactions.map((tx, idx) => (
              <div key={`${tx.from}-${tx.to}-${idx}`} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{tx.from}</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="font-medium text-gray-900">{tx.to}</span>
                </div>
                <span className="text-lg font-bold text-indigo-600">€{tx.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Fragment>
      )}
    </div>
  )
})

SettlementDisplay.displayName = 'SettlementDisplay'

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
}

export default SettlementDisplay
