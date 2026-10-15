import enQuestions from '../../data/locales/en/questions.json'
import jaQuestions from '../../data/locales/ja/questions.json'
import enResults from '../../data/locales/en/results.json'
import jaResults from '../../data/locales/ja/results.json'
import ui from '../../data/locales/ui.json'
import type { Question, ResultType } from './types'

export type Locale = 'zh-CN' | 'en' | 'ja'
export const LOCALES: Locale[] = ['zh-CN', 'en', 'ja']
export const TRANSLATION_VERSION = '2026-10-15.1'
export const LANGUAGE_NAMES: Record<Locale, string> = { 'zh-CN': '中文', en: 'English', ja: '日本語' }
export type MessageKey = keyof typeof ui.en

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}

export function message(locale: Locale, key: MessageKey): string {
  return ui[locale][key]
}

/** Only presentation changes. IDs, option values, poles and sampling stay canonical. */
export function localizeQuestions(items: Question[], locale: Locale): Question[] {
  if (locale === 'zh-CN') return items
  const catalog = (locale === 'en' ? enQuestions : jaQuestions) as Record<string, string[]>
  return items.map(q => {
    const row = catalog[String(q.id)]
    if (!row || row.length !== 6) throw new Error('Incomplete question translation: ' + q.id)
    return { ...q, text: row[0], options: q.options.map(o => ({ ...o, text: row[5 - o.value] })) }
  })
}

export function localizeResult(type: ResultType, locale: Locale): ResultType {
  if (locale === 'zh-CN') return type
  const catalog = (locale === 'en' ? enResults : jaResults) as Record<string, Partial<ResultType>>
  const translation = catalog[type.code]
  if (!translation) throw new Error('Incomplete type translation: ' + type.code)
  return { ...type, ...translation, code: type.code, letters: type.letters, vibe: type.vibe }
}

export function urlFor(locale: Locale, gallery = false): string {
  return `${import.meta.env.BASE_URL}?lang=${locale}${gallery ? '&gallery=1' : ''}`
}
