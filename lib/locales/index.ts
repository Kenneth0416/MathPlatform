import { en } from './en'
import { zhCN } from './zh-CN'
import { zhTW } from './zh-TW'

export type Language = "en" | "zh-CN" | "zh-TW"

export const locales = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
}

export const defaultLanguage: Language = "en"

export type TranslationKey = keyof typeof en