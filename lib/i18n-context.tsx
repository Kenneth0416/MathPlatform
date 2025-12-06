"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { Language, locales, defaultLanguage, TranslationKey } from "./locales"

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey, fallback?: string) => string
  isRTL: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)

  // Load saved language from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('math-platform-language') as Language
      if (saved && Object.keys(locales).includes(saved)) {
        setLanguageState(saved)
      }
    } catch (error) {
      console.warn('Failed to load language from localStorage:', error)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem('math-platform-language', lang)
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error)
    }
  }

  const t = (key: TranslationKey, fallback?: string): string => {
    const translation = locales[language]?.[key]
    if (translation) {
      return translation
    }

    // Fallback to default language
    const fallbackTranslation = locales[defaultLanguage]?.[key]
    if (fallbackTranslation) {
      return fallbackTranslation
    }

    // Use provided fallback or key itself
    return fallback || key
  }

  const isRTL = false // Currently no RTL languages supported

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    isRTL,
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Export a simple translation function for non-component usage
export function getTranslation(language: Language, key: TranslationKey, fallback?: string): string {
  const translation = locales[language]?.[key]
  if (translation) {
    return translation
  }

  const fallbackTranslation = locales[defaultLanguage]?.[key]
  if (fallbackTranslation) {
    return fallbackTranslation
  }

  return fallback || key
}