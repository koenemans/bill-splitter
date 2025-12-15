import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home';
import Split from './pages/Split';
import LanguageSwitcher from './components/LanguageSwitcher';
import { logger } from './utils/logger';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Log page views for analytics
    const pageName =
      location.pathname === '/'
        ? 'Home'
        : location.pathname.startsWith('/split/')
          ? 'Split'
          : 'Unknown';

    logger.pageView(pageName, location.pathname + location.search);
  }, [location]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='absolute top-4 right-4 z-10'>
        <LanguageSwitcher />
      </div>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/split/:id' element={<Split />} />
      </Routes>
    </div>
  );
}

export default App;
