import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Split from './pages/Split'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/split/:id" element={<Split />} />
      </Routes>
    </div>
  )
}

export default App
