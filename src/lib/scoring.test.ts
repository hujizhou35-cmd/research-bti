import { describe, it, expect } from 'vitest'
import { computeResult } from './scoring'
import { questions, funQuestions, dimensions, resultTypes } from './data'
import type { Answers, OptionValue, Question } from './types'

/** 整套题集都选同一个 value */
function answerAll(items: Question[], value: OptionValue): Answers {
  const a: Answers = {}
  for (const q of items) a[q.id] = value
  return a
}

/** 按目标 4 字母 code 构造作答：目标=第一极→该维全 value=4(strength=10)，否则全 value=0 */
function answersForCode(items: Question[], code: string): Answers {
  const a: Answers = {}
  const dimIndex = new Map(dimensions.map((d, i) => [d.key, i]))
  for (const q of items) {
    const target = code[dimIndex.get(q.dimension)!]
    a[q.id] = target === q.firstPole ? 4 : 0
  }
  return a
}

describe('computeResult 极性五级计分（§4 polarity-graded-5）', () => {
  it('严谨版全选 value=4 → 每维 strength=10、code=COPT、无 borderline', () => {
    const r = computeResult(questions, answerAll(questions, 4))
    expect(r.code).toBe('COPT')
    expect(r.dimensions.every((d) => d.strength === 10)).toBe(true)
    expect(r.dimensions.every((d) => d.borderline === false)).toBe(true)
  })

  it('严谨版全选 value=0 → 每维 strength=0、code=XARW、无 borderline', () => {
    const r = computeResult(questions, answerAll(questions, 0))
    expect(r.code).toBe('XARW')
    expect(r.dimensions.every((d) => d.strength === 0)).toBe(true)
    expect(r.dimensions.every((d) => d.borderline === false)).toBe(true)
  })

  it('严谨版全选 value=2 → 每维 strength=5、全 borderline、取第二极 XARW', () => {
    const r = computeResult(questions, answerAll(questions, 2))
    expect(r.dimensions.every((d) => d.strength === 5)).toBe(true)
    expect(r.dimensions.every((d) => d.borderline === true)).toBe(true)
    expect(r.code).toBe('XARW')
  })

  it('娱乐版(n=10)与严谨版(n=20)相同倾向(全 value=3) → strength 一致(7.5)、code 一致', () => {
    const fun = computeResult(funQuestions, answerAll(funQuestions, 3))
    const strict = computeResult(questions, answerAll(questions, 3))
    expect(fun.dimensions.map((d) => d.strength)).toEqual(strict.dimensions.map((d) => d.strength))
    expect(fun.dimensions.every((d) => d.strength === 7.5)).toBe(true)
    expect(fun.code).toBe('COPT')
    expect(strict.code).toBe('COPT')
  })

  it('娱乐版恰 40 题、严谨版恰 80 题', () => {
    expect(funQuestions).toHaveLength(40)
    expect(questions).toHaveLength(80)
  })

  it('poles 不变式：同维两极之和恒为 10，八极总和为 40', () => {
    const r = computeResult(questions, answersForCode(questions, 'COPW'))
    for (const dim of dimensions) {
      const sum = r.poles[dim.firstPole.key] + r.poles[dim.secondPole.key]
      expect(sum).toBeCloseTo(10, 6)
    }
    const total = Object.values(r.poles).reduce((x, y) => x + y, 0)
    expect(total).toBeCloseTo(40, 6)
  })

  it('poles[firstPole]=strength、poles[secondPole]=10-strength', () => {
    const r = computeResult(questions, answersForCode(questions, 'CAPW'))
    for (const d of r.dimensions) {
      const dim = dimensions.find((x) => x.key === d.key)!
      expect(r.poles[dim.firstPole.key]).toBeCloseTo(d.strength, 6)
      expect(r.poles[dim.secondPole.key]).toBeCloseTo(10 - d.strength, 6)
    }
  })

  it('borderline 带边界：strength=5.75(raw=46/80) 标 borderline，strength=6.0(raw=48/80) 不标', () => {
    // 仅看 CX 维（题号最小的一维），其余维随意填满
    const cx = questions.filter((q) => q.dimension === 'CX')
    function strengthOfCX(raw: number): Answers {
      const a: Answers = answerAll(questions, 0)
      // 在 CX 维（20 题）上铺出指定 raw：尽量平均，值都在 0..4 内
      let remaining = raw
      for (const q of cx) {
        const v = Math.min(4, remaining) as OptionValue
        a[q.id] = v
        remaining -= v
      }
      return a
    }
    const r575 = computeResult(questions, strengthOfCX(46)) // 46/(4*20)*10 = 5.75
    const r600 = computeResult(questions, strengthOfCX(48)) // 48/(4*20)*10 = 6.0
    const cx575 = r575.dimensions.find((d) => d.key === 'CX')!
    const cx600 = r600.dimensions.find((d) => d.key === 'CX')!
    expect(cx575.strength).toBeCloseTo(5.75, 6)
    expect(cx575.borderline).toBe(true)
    expect(cx600.strength).toBeCloseTo(6.0, 6)
    expect(cx600.borderline).toBe(false)
  })

  it('16 型覆盖性：每个 results.json 中的 code 都能被命中（严谨版与娱乐版均可）', () => {
    expect(resultTypes).toHaveLength(16)
    for (const t of resultTypes) {
      const strict = computeResult(questions, answersForCode(questions, t.code))
      const fun = computeResult(funQuestions, answersForCode(funQuestions, t.code))
      expect(strict.code).toBe(t.code)
      expect(fun.code).toBe(t.code)
      expect(strict.type.code).toBe(t.code)
    }
  })

  it('遍历全部 16 种组合都能查到类型', () => {
    for (const c of ['C', 'X'])
      for (const o of ['O', 'A'])
        for (const p of ['P', 'R'])
          for (const tw of ['T', 'W']) {
            const code = c + o + p + tw
            const r = computeResult(questions, answersForCode(questions, code))
            expect(r.code).toBe(code)
          }
  })

  it('作答不全 → 抛错', () => {
    const partial: Answers = { 1: 4 }
    expect(() => computeResult(questions, partial)).toThrow()
  })

  it('作答含非法 value → 抛错', () => {
    const a = answerAll(questions, 4)
    // @ts-expect-error 故意写入非法 value 触发校验
    a[1] = 9
    expect(() => computeResult(questions, a)).toThrow()
  })
})
