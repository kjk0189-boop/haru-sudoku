import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'ko' | 'en';
export const LANGUAGE_KEY = 'haru-sudoku:language:v1';
export const restoreLanguage = (raw: string | null): Language => raw === 'en' ? 'en' : 'ko';

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (korean: string, english: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return restoreLanguage(localStorage.getItem(LANGUAGE_KEY)); } catch { return 'ko'; }
  });
  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* The current session can still switch languages. */ }
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'Haru Sudoku' : '하루 스도쿠';
  }, [language]);
  return <I18nContext.Provider value={{ language, setLanguage, t: (ko, en) => language === 'en' ? en : ko }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
