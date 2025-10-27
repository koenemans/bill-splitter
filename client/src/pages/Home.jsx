import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const createSplit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        navigate(`/split/${data.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create split. Please try again.')
      }
    } catch (error) {
      console.error('Error creating split:', error)
      alert('Failed to create split. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bill Splitter</h1>
            <p className="text-gray-600">
              Split bills easily with your friends. No signup required.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mr-3">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Create a split</h3>
                <p className="text-sm text-gray-600">Start a new bill split session</p>
              </div>
            </div>
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mr-3">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Share the link</h3>
                <p className="text-sm text-gray-600">Send it to everyone in your group</p>
              </div>
            </div>
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mr-3">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add expenses</h3>
                <p className="text-sm text-gray-600">Everyone adds their name and what they paid</p>
              </div>
            </div>
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mr-3">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Get the results</h3>
                <p className="text-sm text-gray-600">See who owes whom automatically</p>
              </div>
            </div>
          </div>

          <button
            onClick={createSplit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create New Split'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
