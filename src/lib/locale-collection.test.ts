import { describe, expect, it } from 'vitest'
import { buildSubmitPayload, buildCsv, validatePayload, type ResponseRow } from './collect'
import { funQuestions } from './data'
import { computeResult } from './scoring'
import { LOCALES, TRANSLATION_VERSION } from './locale'
import type { Answers } from './types'

function payload() {
  const answers = Object.fromEntries(funQuestions.map(q => [q.id, 2])) as Answers
  const result = computeResult(funQuestions, answers)
  return buildSubmitPayload({ items: funQuestions, answers, flips: {}, times: {}, mode: 'fun', code: result.code, dimensions: result.dimensions, selfReport: 'serious', questionsVersion: '2.1', clientId: 'synthetic-browser', consentVersion: 'v2', consentAt: '2026-10-15T00:00:00Z' })
}
describe('language metadata compatibility', () => {
  it('accepts historical payloads and all supported language pairs', () => {
    expect(validatePayload(payload()).ok).toBe(true)
    for (const locale of LOCALES) expect(validatePayload({ ...payload(), locale, translationVersion: TRANSLATION_VERSION }).ok).toBe(true)
  })
  it('rejects unsupported or incomplete translation metadata', () => {
    for (const extra of [{ locale: 'fr', translationVersion: 'x' }, { locale: 'en' }, { translationVersion: 'x' }, { locale: 'en', translationVersion: '' }]) expect(validatePayload({ ...payload(), ...extra }).ok).toBe(false)
  })
  it('exports legacy language as empty and new language explicitly', () => {
    const row = { answers: '{}', locale: null, translation_version: null } as ResponseRow
    const csv = buildCsv([row, { ...row, locale: 'ja', translation_version: TRANSLATION_VERSION }])
    expect(csv.split('\r\n')[0]).toContain('"locale","translation_version"')
    expect(csv.split('\r\n')[1].endsWith(',"",""')).toBe(true)
    expect(csv.split('\r\n')[2].endsWith(',"ja","' + TRANSLATION_VERSION + '"')).toBe(true)
  })
})
