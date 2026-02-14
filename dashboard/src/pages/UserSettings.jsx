import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getDeviceInfo, PerformanceLevel } from '../utils/performanceDetector';
import { useTranslation } from 'react-i18next';

export default function UserSettings() {
  const { settings, setTheme, setLanguage, setPerformanceLevel, resetToDefaults } = useSettings();
  const { t } = useTranslation();
  const deviceInfo = getDeviceInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('settings.title')}</h1>
          <p className="text-gray-400">{t('settings.subtitle')}</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          
          {/* Theme Settings */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>🎨</span> {t('settings.theme.title')}
            </h2>
            <p className="text-gray-400 mb-4">{t('settings.theme.description')}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'dark'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🌙</div>
                  <div className="text-white font-semibold">{t('settings.theme.dark')}</div>
                  {settings.theme === 'dark' && (
                    <div className="text-purple-400 text-sm mt-1">✓ {t('settings.active')}</div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'light'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">☀️</div>
                  <div className="text-white font-semibold">{t('settings.theme.light')}</div>
                  {settings.theme === 'light' && (
                    <div className="text-purple-400 text-sm mt-1">✓ {t('settings.active')}</div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Language Settings */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>🌍</span> {t('settings.language.title')}
            </h2>
            <p className="text-gray-400 mb-4">{t('settings.language.description')}</p>
            
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setLanguage('en')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.language === 'en'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🇬🇧</div>
                  <div className="text-white font-semibold">English</div>
                  {settings.language === 'en' && (
                    <div className="text-purple-400 text-sm mt-1">✓</div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setLanguage('fr')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.language === 'fr'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🇫🇷</div>
                  <div className="text-white font-semibold">Français</div>
                  {settings.language === 'fr' && (
                    <div className="text-purple-400 text-sm mt-1">✓</div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setLanguage('ar')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.language === 'ar'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🇸🇦</div>
                  <div className="text-white font-semibold">العربية</div>
                  {settings.language === 'ar' && (
                    <div className="text-purple-400 text-sm mt-1">✓</div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>⚡</span> {t('settings.performance.title')}
            </h2>
            <p className="text-gray-400 mb-4">{t('settings.performance.description')}</p>
            
            {settings.autoDetectPerformance && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-300 text-sm">
                ℹ️ {t('settings.performance.autoDetected')}: <strong>{settings.performanceLevel.toUpperCase()}</strong>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => setPerformanceLevel(PerformanceLevel.LOW)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.performanceLevel === PerformanceLevel.LOW
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🐌</div>
                  <div className="text-white font-semibold">{t('settings.performance.low')}</div>
                  <div className="text-gray-400 text-xs mt-1">{t('settings.performance.lowDesc')}</div>
                </div>
              </button>

              <button
                onClick={() => setPerformanceLevel(PerformanceLevel.MEDIUM)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.performanceLevel === PerformanceLevel.MEDIUM
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🚀</div>
                  <div className="text-white font-semibold">{t('settings.performance.medium')}</div>
                  <div className="text-gray-400 text-xs mt-1">{t('settings.performance.mediumDesc')}</div>
                </div>
              </button>

              <button
                onClick={() => setPerformanceLevel(PerformanceLevel.HIGH)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.performanceLevel === PerformanceLevel.HIGH
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-purple-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-white font-semibold">{t('settings.performance.high')}</div>
                  <div className="text-gray-400 text-xs mt-1">{t('settings.performance.highDesc')}</div>
                </div>
              </button>
            </div>

            {/* Device Info */}
            <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
              <h3 className="text-white font-semibold mb-2">{t('settings.performance.deviceInfo')}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">{t('settings.performance.ram')}:</div>
                <div className="text-white">{deviceInfo.memory} GB</div>
                
                <div className="text-gray-400">{t('settings.performance.cores')}:</div>
                <div className="text-white">{deviceInfo.cores}</div>
                
                <div className="text-gray-400">{t('settings.performance.connection')}:</div>
                <div className="text-white">{deviceInfo.connection}</div>
                
                <div className="text-gray-400">{t('settings.performance.device')}:</div>
                <div className="text-white">{deviceInfo.isMobile ? t('settings.performance.mobile') : t('settings.performance.desktop')}</div>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-center">
            <button
              onClick={resetToDefaults}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 font-semibold transition-all"
            >
              🔄 {t('settings.resetDefaults')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
