import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = memo(() => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = e => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className='flex items-center gap-1 sm:gap-2'>
      <label
        htmlFor='language-select'
        className='text-xs sm:text-sm text-gray-600 hidden sm:inline'
      >
        {t('language.label')}:
      </label>
      <select
        id='language-select'
        value={i18n.language}
        onChange={handleLanguageChange}
        className='px-1.5 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
      >
        <option value='en'>{t('language.en')}</option>
        <option value='nl'>{t('language.nl')}</option>
      </select>
    </div>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';

export default LanguageSwitcher;
