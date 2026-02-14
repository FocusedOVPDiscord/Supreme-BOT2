import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectPerformanceLevel, getAnimationSettings } from '../utils/performanceDetector';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('supreme-bot-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    
    // Default settings
    const performanceLevel = detectPerformanceLevel();
    const animationSettings = getAnimationSettings(performanceLevel);
    
    return {
      theme: 'dark', // 'dark' or 'light'
      language: 'en', // 'en', 'fr', 'ar'
      performanceLevel: performanceLevel,
      animationSettings: animationSettings,
      autoDetectPerformance: true
    };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('supreme-bot-settings', JSON.stringify(settings));
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', settings.theme);
    
    // Apply language direction (RTL for Arabic)
    document.documentElement.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', settings.language);
    
    // Apply performance settings
    document.documentElement.setAttribute('data-performance', settings.performanceLevel);
    
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const setTheme = (theme) => {
    updateSettings({ theme });
  };

  const setLanguage = (language) => {
    updateSettings({ language });
  };

  const setPerformanceLevel = (level) => {
    const animationSettings = getAnimationSettings(level);
    updateSettings({
      performanceLevel: level,
      animationSettings: animationSettings,
      autoDetectPerformance: false
    });
  };

  const resetToDefaults = () => {
    const performanceLevel = detectPerformanceLevel();
    const animationSettings = getAnimationSettings(performanceLevel);
    
    setSettings({
      theme: 'dark',
      language: 'en',
      performanceLevel: performanceLevel,
      animationSettings: animationSettings,
      autoDetectPerformance: true
    });
  };

  const value = {
    settings,
    updateSettings,
    setTheme,
    setLanguage,
    setPerformanceLevel,
    resetToDefaults
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
