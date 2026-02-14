import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function ThemeLanguageSwitcher() {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState(localStorage.getItem('supreme-theme') || 'dark');
  const [language, setLanguage] = useState(localStorage.getItem('supreme-language') || 'en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('supreme-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply language
    i18n.changeLanguage(language);
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('supreme-language', language);
  }, [language, i18n]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    setShowLanguageMenu(false);
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Theme Switcher */}
      <button
        onClick={toggleTheme}
        className="p-2 md:p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 hover:scale-105"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Language Switcher */}
      <div className="relative">
        <button
          onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 hover:scale-105"
        >
          <span className="text-xl">{currentLanguage.flag}</span>
          <span className="hidden md:inline text-sm font-medium text-white">{currentLanguage.code.toUpperCase()}</span>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Language Dropdown */}
        {showLanguageMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowLanguageMenu(false)}
            />
            
            {/* Menu */}
            <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 border border-white/10 shadow-xl z-20 overflow-hidden">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                    language === lang.code ? 'bg-indigo-500/20 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium">{lang.name}</div>
                    <div className="text-xs text-slate-400">{lang.code.toUpperCase()}</div>
                  </div>
                  {language === lang.code && (
                    <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
