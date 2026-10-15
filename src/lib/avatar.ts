import { localizeResult, message, type Locale } from './locale'
import type { ResultType } from './types'
import labels from '../../data/locales/avatars.json'

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export function localizeAvatar(svg: string, type: ResultType, locale: Locale): string {
  if (locale === 'zh-CN') return svg
  const name = localizeResult(type, locale).name
  const replacements: Record<string, string> = { ...labels[locale], [type.name]: name,
    '稀有': message(locale, 'vibeRare'), '常见': message(locale, 'vibeCommon'), '少见': message(locale, 'vibeUncommon'),
    '棘手': message(locale, 'vibeTricky'), '高危': message(locale, 'vibeRisk') }
  let result = svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (whole, attributes: string, source: string) => {
    const key = Object.keys(replacements).find(k => xml(k) === source)
    if (!key) return whole
    const target = replacements[key]
    const fontSize = Number(attributes.match(/font-size="([\d.]+)"/)?.[1])
    const smallWidths: Record<string, number> = { '勿扰': 135, '不是我！': 145, '全世界针对我': 140, '借口': 65, '还不敢交…': 160, '汇报×99': 100, '分内': 105, '分外': 105 }
    const width = key === type.name ? 520 : ['稀有','常见','少见','棘手','高危'].includes(key) ? (fontSize >= 30 ? 96 : 70) : smallWidths[key]
    if (width && fontSize) {
      const units = [...target].reduce((sum, c) => sum + (/[^\x00-\x7f]/.test(c) ? 1 : .62), 0)
      attributes = attributes.replace(/font-size="[\d.]+"/, 'font-size="' + Math.min(fontSize, width / units).toFixed(2) + '"')
    }
    return '<text' + attributes + '>' + xml(target) + '</text>'
  })
  if (locale === 'ja') result = result.split('Noto Sans SC').join('Noto Sans JP')
  return result
}
