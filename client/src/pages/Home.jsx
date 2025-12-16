import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSplitApi } from '../hooks/useApi';
import { logger } from '../utils/logger';

const Home = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createSplit, loading, clearError } = useSplitApi();

  const handleCreateSplit = async () => {
    try {
      clearError();
      logger.userAction('create_split', 'button');
      const data = await createSplit();
      logger.splitCreated(data.id);
      navigate(`/split/${data.id}`);
    } catch (err) {
      logger.apiError('create_split', err);
      alert(err.message || t('errors.createSplit'));
    }
  };

  return (
    <div className='flex-1 flex items-center justify-center p-4 sm:p-6'>
      <div className='max-w-md w-full'>
        <div className='bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center'>
          <div className='mb-6'>
            <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center'>
              <svg
                className='w-8 h-8 sm:w-10 sm:h-10 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
                />
              </svg>
            </div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-2'>
              {t('app.title')}
            </h1>
            <p className='text-sm sm:text-base text-gray-600'>
              {t('app.tagline')}
            </p>
          </div>

          <div className='space-y-3 sm:space-y-4 mb-6 sm:mb-8'>
            <div className='flex items-start text-left'>
              <div className='flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs sm:text-sm mr-3'>
                1
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 text-sm sm:text-base'>
                  {t('home.step1Title')}
                </h3>
                <p className='text-xs sm:text-sm text-gray-600'>
                  {t('home.step1Description')}
                </p>
              </div>
            </div>
            <div className='flex items-start text-left'>
              <div className='flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs sm:text-sm mr-3'>
                2
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 text-sm sm:text-base'>
                  {t('home.step2Title')}
                </h3>
                <p className='text-xs sm:text-sm text-gray-600'>
                  {t('home.step2Description')}
                </p>
              </div>
            </div>
            <div className='flex items-start text-left'>
              <div className='flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs sm:text-sm mr-3'>
                3
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 text-sm sm:text-base'>
                  {t('home.step3Title')}
                </h3>
                <p className='text-xs sm:text-sm text-gray-600'>
                  {t('home.step3Description')}
                </p>
              </div>
            </div>
            <div className='flex items-start text-left'>
              <div className='flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs sm:text-sm mr-3'>
                4
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 text-sm sm:text-base'>
                  {t('home.step4Title')}
                </h3>
                <p className='text-xs sm:text-sm text-gray-600'>
                  {t('home.step4Description')}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateSplit}
            disabled={loading}
            className='w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 sm:py-4 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation'
          >
            {loading ? t('home.creating') : t('home.createButton')}
          </button>
        </div>
      </div>
    </div>
  );
});

Home.displayName = 'Home';

export default Home;
