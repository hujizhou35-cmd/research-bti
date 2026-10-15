import { describe, expect, it } from 'vitest'
import { questions, funQuestions, resultTypes } from './data'
import { LOCALES, localizeQuestions, localizeResult, message } from './locale'
import { computeResult } from './scoring'
import ui from '../../data/locales/ui.json'
import enQuestions from '../../data/locales/en/questions.json'
import jaQuestions from '../../data/locales/ja/questions.json'
import type { Answers, OptionValue } from './types'

describe('translation coverage and scoring preservation', () => {
  it('has every UI key, question and result in all languages', () => {
    for (const locale of LOCALES) {
      expect(Object.keys(ui[locale]).sort()).toEqual(Object.keys(ui.en).sort())
      expect(Object.values(ui[locale]).every(v => typeof v === 'string' && v.trim())).toBe(true)
      for (const items of [questions, funQuestions]) {
        const translated = localizeQuestions(items, locale)
        expect(translated.map(q => ({ ...q, text: '', options: q.options.map(o => ({ ...o, text: '' })) })))
          .toEqual(items.map(q => ({ ...q, text: '', options: q.options.map(o => ({ ...o, text: '' })) })))
        expect(translated.every(q => q.text && q.options.every(o => o.text))).toBe(true)
      }
      for (const type of resultTypes) {
        const translated = localizeResult(type, locale)
        expect(translated.code).toBe(type.code)
        for (const key of ['name', 'tagline', 'portrait', 'mentorStrategy'] as const) expect(translated[key].trim()).not.toBe('')
        for (const key of ['pros', 'cons', 'mentorActions', 'mentorTips'] as const) expect(translated[key].length).toBe(type[key].length)
      }
    }
    expect(Object.keys(enQuestions).length).toBe(80)
    expect(Object.keys(jaQuestions).length).toBe(80)
  })

  it('produces all sixteen identical types, scores and boundaries in both modes', () => {
    for (const items of [questions, funQuestions]) {
      for (let mask = 0; mask < 16; mask++) {
        const answers: Answers = {}
        for (const q of items) answers[q.id] = ((mask >> ['CX','OA','PR','TW'].indexOf(q.dimension)) & 1 ? 4 : 0) as OptionValue
        const reference = computeResult(items, answers)
        for (const locale of LOCALES) expect(computeResult(localizeQuestions(items, locale), answers)).toEqual(reference)
      }
      for (const value of [1, 2, 3] as const) {
        const answers = Object.fromEntries(items.map(q => [q.id, value])) as Answers
        for (const locale of LOCALES) expect(computeResult(localizeQuestions(items, locale), answers)).toEqual(computeResult(items, answers))
      }
    }
  })

  it('uses value-keyed translations even when source option order changes', () => {
    const reversed = [{ ...questions[0], options: [...questions[0].options].reverse() }]
    const normal = localizeQuestions([questions[0]], 'en')[0]
    for (const option of localizeQuestions(reversed, 'en')[0].options) expect(option.text).toBe(normal.options.find(o => o.value === option.value)?.text)
    expect(message('ja', 'agree')).toContain('同意')
  })
})
