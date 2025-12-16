import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'nl', label: 'NL' },
];

const Footer = memo(() => {
  const { i18n } = useTranslation();
  const currentYear = new Date().getFullYear();

  const handleLanguageChange = langCode => {
    i18n.changeLanguage(langCode);
  };

  return (
    <footer className='py-4 px-4 text-center text-xs sm:text-sm text-gray-500'>
      <div className='flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4'>
        <span>© {currentYear} Koenraad</span>
        <span className='hidden sm:inline'>•</span>
        <a
          href='https://github.com/koenemans/bill-splitter'
          target='_blank'
          rel='noopener noreferrer'
          className='hover:text-gray-900 transition-colors'
        >
          MIT License
        </a>
        <span className='hidden sm:inline'>•</span>
        <div className='flex items-center gap-1'>
          {LANGUAGES.map((lang, idx) => (
            <span key={lang.code} className='flex items-center'>
              {idx > 0 && <span className='mx-1 text-gray-300'>|</span>}
              <button
                onClick={() => handleLanguageChange(lang.code)}
                className={`px-1 hover:text-gray-900 transition-colors ${
                  i18n.language === lang.code
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {lang.label}
              </button>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
