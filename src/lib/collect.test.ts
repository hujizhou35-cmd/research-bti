import { describe, expect, it } from 'vitest'
import {
  buildCsv,
  buildSubmitPayload,
  posOf,
  validatePayload,
  type ResponseRow,
} from './collect'
import type { DimensionScore, Question } from './types'

// 造两道最小题（CX/TW），仅含计分相关字段
function q(id: number, dimension: Question['dimension'], firstPole: Question['firstPole'], secondPole: Question['secondPole']): Question {
  return {
    id,
    dimension,
    firstPole,
    secondPole,
    theme: 't',
    priority: 1,
    text: 'x',
    options: [
      { text: 'a', pole: firstPole, value: 4 },
      { text: 'b', pole: firstPole, value: 3 },
      { text: 'c', pole: 'mid', value: 2 },
      { text: 'd', pole: secondPole, value: 1 },
      { text: 'e', pole: secondPole, value: 0 },
    ],
  }
}

describe('posOf', () => {
  it('未翻转：value 4→A, 0→E', () => {
    expect(posOf(4, false)).toBe('A')
    expect(posOf(2, false)).toBe('C')
    expect(posOf(0, false)).toBe('E')
  })
  it('翻转：value 4→E, 0→A', () => {
    expect(posOf(4, true)).toBe('E')
    expect(posOf(0, true)).toBe('A')
  })
})

describe('buildSubmitPayload', () => {
  const items = [q(1, 'CX', 'C', 'X'), q(2, 'TW', 'T', 'W')]
  const dims: DimensionScore[] = [
    { key: 'CX', raw: 4, strength: 10, picked: 'C', borderline: false },
    { key: 'TW', raw: 0, strength: 0, picked: 'W', borderline: false },
  ]
  const payload = buildSubmitPayload({
    items,
    answers: { 1: 4, 2: 0 },
    flips: { 1: false, 2: true },
    times: { 1: 3000, 2: 1500 },
    mode: 'fun',
    code: 'CXXW',
    dimensions: dims,
    selfReport: 'serious',
    questionsVersion: '2.1',
    clientId: 'client-abc',
    consentVersion: 'v1',
    consentAt: '2026-06-28T00:00:00.000Z',
  })

  it('记录 value/pole/flipped/pos/t，pos 与翻转一致', () => {
    expect(payload.answers['1']).toEqual({ v: 4, pole: 'C', flipped: false, pos: 'A', t: 3000 })
    expect(payload.answers['2']).toEqual({ v: 0, pole: 'W', flipped: true, pos: 'A', t: 1500 })
  })
  it('strengths 从维度结果映射', () => {
    expect(payload.strengths.CX).toBe(10)
    expect(payload.strengths.TW).toBe(0)
  })
  it('durationMs 为各题用时之和；selfReport 透传', () => {
    expect(payload.durationMs).toBe(4500)
    expect(payload.selfReport).toBe('serious')
  })
})

describe('validatePayload', () => {
  function good() {
    const answers: Record<string, unknown> = {}
    for (let i = 1; i <= 40; i++) answers[String(i)] = { v: 2, pole: 'mid', flipped: false, pos: 'C' }
    return {
      questionsVersion: '2.1',
      clientId: 'client-abc',
      mode: 'fun',
      consentVersion: 'v1',
      consentAt: '2026-06-28T00:00:00.000Z',
      code: 'COPT',
      strengths: { CX: 5, OA: 5, PR: 5, TW: 5 },
      durationMs: 120000,
      selfReport: 'serious',
      answers,
    }
  }

  it('合法载荷通过', () => {
    expect(validatePayload(good()).ok).toBe(true)
  })
  it('题数不符被拒（fun 必须 40）', () => {
    const b = good()
    delete (b.answers as Record<string, unknown>)['40']
    const r = validatePayload(b)
    expect(r.ok).toBe(false)
  })
  it('缺少同意被拒', () => {
    const b = good() as Record<string, unknown>
    b.consentVersion = ''
    expect(validatePayload(b).ok).toBe(false)
  })
  it('value 越界被拒', () => {
    const b = good()
    ;(b.answers as Record<string, { v: number }>)['1'].v = 9
    expect(validatePayload(b).ok).toBe(false)
  })
  it('selfReport 非法被拒', () => {
    const b = good() as Record<string, unknown>
    b.selfReport = 'lazy'
    expect(validatePayload(b).ok).toBe(false)
  })
  it('durationMs 缺失/非法被拒', () => {
    const b = good() as Record<string, unknown>
    b.durationMs = -1
    expect(validatePayload(b).ok).toBe(false)
  })
  it('clientId 缺失被拒', () => {
    const b = good() as Record<string, unknown>
    b.clientId = ''
    expect(validatePayload(b).ok).toBe(false)
  })
  it('pos 不自洽被拒（伪造载荷）', () => {
    const b = good()
    // v=2,flipped=false 应为 pos C；改成 A 即不自洽
    ;(b.answers as Record<string, { pos: string }>)['1'].pos = 'A'
    expect(validatePayload(b).ok).toBe(false)
  })
  it('非对象被拒', () => {
    expect(validatePayload(null).ok).toBe(false)
    expect(validatePayload('x').ok).toBe(false)
  })
})

describe('buildCsv', () => {
  const row: ResponseRow = {
    id: 'abc',
    client_id: 'client-xyz',
    created_at: '2026-06-28T00:00:00.000Z',
    questions_version: '2.1',
    mode: 'fun',
    consent_version: 'v1',
    consent_at: '2026-06-28T00:00:00.000Z',
    code: 'COPT',
    strength_cx: 7.5,
    strength_oa: 5,
    strength_pr: 5,
    strength_tw: 5,
    duration_ms: 90000,
    self_report: 'serious',
    turnstile: 'pass',
    answers: JSON.stringify({ '1': { v: 4, pole: 'C', flipped: false, pos: 'A', t: 3000 }, '21': { v: 0, pole: 'A', flipped: true, pos: 'A', t: 1200 } }),
  }

  it('表头含 q1..q80、client_id/duration_ms/self_report/turnstile 与 answers_json', () => {
    const csv = buildCsv([row])
    const header = csv.split('\r\n')[0]
    expect(header).toContain('"q1"')
    expect(header).toContain('"q80"')
    expect(header).toContain('"client_id"')
    expect(header).toContain('"duration_ms"')
    expect(header).toContain('"self_report"')
    expect(header).toContain('"turnstile"')
    expect(header).toContain('"answers_json"')
  })
  it('q 列填入 value，未答留空', () => {
    const csv = buildCsv([row])
    const dataLine = csv.split('\r\n')[1]
    const cells = dataLine.split('","')
    // 第 1 列 id
    expect(dataLine.startsWith('"abc"')).toBe(true)
    // 15 个 meta 列（id,client_id,…,duration_ms,self_report,turnstile）后是 q1
    const q1Index = 15
    expect(cells[q1Index]).toBe('4')
    expect(cells[q1Index + 1]).toBe('')
  })
  it('转义引号', () => {
    const r2 = { ...row, code: 'A"B' }
    const csv = buildCsv([r2])
    expect(csv).toContain('"A""B"')
  })
})
