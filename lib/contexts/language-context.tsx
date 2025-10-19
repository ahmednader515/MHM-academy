"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Import translations directly
import arTranslations from '../translations/ar.json';
import enTranslations from '../translations/en.json';

// Translation data
const translations: Record<Language, Record<string, any>> = {
  ar: arTranslations,
  en: enTranslations
};

// Translation function
const translate = (key: string, lang: Language, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to Arabic if key not found in current language
      if (lang !== 'ar') {
        let fallbackValue: any = translations.ar;
        for (const fallbackKey of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fallbackKey in fallbackValue) {
            fallbackValue = fallbackValue[fallbackKey];
          } else {
            return key; // Return key if not found in fallback either
          }
        }
        value = fallbackValue;
      } else {
        return key; // Return key if not found
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Replace parameters in the translation
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }
  
  return value;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');
  const [isRTL, setIsRTL] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
      setIsRTL(savedLanguage === 'ar');
    }
  }, []);

  // Update RTL state and document attributes when language changes
  useEffect(() => {
    setIsRTL(language === 'ar');
    
    // Update document attributes
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    
    // Update body class for font
    document.body.className = language === 'ar' 
      ? 'font-pt-serif' 
      : 'font-pt-serif';
    
    // Save to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    // During SSR and initial render, always use Arabic to prevent hydration mismatch
    if (typeof window === 'undefined' || !mounted) {
      return translate(key, 'ar', params);
    }
    return translate(key, language, params);
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isRTL
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
