import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

function Split() {
  const { id } = useParams()
  const [split, setSplit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentParticipant, setCurrentParticipant] = useState(null)
  const [settlement, setSettlement] = useState(null)
  
  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const shareUrl = `${window.location.origin}/split/${id}`

  useEffect(() => {
    loadSplit()
    const interval = setInterval(loadSplit, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    if (split && split.participants.every(p => p.isDone)) {
      loadSettlement()
    }
  }, [split])

  const loadSplit = async () => {
    try {
      const response = await fetch(`/api/splits/${id}`)
      if (response.ok) {
        const data = await response.json()
        setSplit(data)
      }
    } catch (error) {
      console.error('Error loading split:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettlement = async () => {
    try {
      const response = await fetch(`/api/splits/${id}/settlement`)
      if (response.ok) {
        const data = await response.json()
        if (data.ready) {
          setSettlement(data)
        }
      }
    } catch (error) {
      console.error('Error loading settlement:', error)
    }
  }

  const addParticipant = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const response = await fetch(`/api/splits/${id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (response.ok) {
        const participant = await response.json()
        setCurrentParticipant(participant)
        setName('')
        loadSplit()
      }
    } catch (error) {
      console.error('Error adding participant:', error)
    }
  }

  const addExpense = async (e) => {
    e.preventDefault()
    if (!description.trim() || !amount || !currentParticipant) return

    try {
      const response = await fetch(`/api/splits/${id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          description,
          amount: parseFloat(amount)
        })
      })
      if (response.ok) {
        setDescription('')
        setAmount('')
        loadSplit()
      }
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  const deleteExpense = async (expenseId) => {
    try {
      const response = await fetch(`/api/splits/${id}/expenses/${expenseId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        loadSplit()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const markDone = async () => {
    if (!currentParticipant) return

    try {
      const response = await fetch(`/api/splits/${id}/participants/${currentParticipant.id}/done`, {
        method: 'PATCH'
      })
      if (response.ok) {
        setCurrentParticipant(null)
        loadSplit()
      }
    } catch (error) {
      console.error('Error marking done:', error)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('Link copied to clipboard!')
  }

  const myExpenses = split?.expenses.filter(e => e.participantId === currentParticipant?.id) || []
  const myTotal = myExpenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!split) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Split not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bill Split</h1>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Settlement Results */}
        {settlement && (
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
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
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
              <>
                <h3 className="font-semibold text-gray-900 mb-3">Who Pays Whom</h3>
                <div className="space-y-2">
                  {settlement.transactions.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
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
              </>
            )}
          </div>
        )}

        {/* Participants */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Participants</h2>
          
          {split.participants.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No participants yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {split.participants.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border-2 ${
                    p.isDone
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-600">
                    {p.isDone ? '✓ Done' : 'Adding expenses...'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Participant or Expenses */}
        {!currentParticipant ? (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Join the Split</h2>
            <form onSubmit={addParticipant} className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                Join
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {currentParticipant.name}'s Expenses
              </h2>
              <div className="text-lg font-semibold text-indigo-600">
                Total: €{myTotal.toFixed(2)}
              </div>
            </div>

            {/* Expense List */}
            {myExpenses.length > 0 && (
              <div className="mb-6 space-y-2">
                {myExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-900">{expense.description}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">€{expense.amount.toFixed(2)}</span>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Expense Form */}
            <form onSubmit={addExpense} className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  className="sm:col-span-2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full mt-3 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Expense
              </button>
            </form>

            {/* Done Button */}
            <button
              onClick={markDone}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
            >
              I'm Done Adding Expenses
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Split
