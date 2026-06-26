import { describe, it, expect } from 'vitest'
import { score } from './scoring'
import { dimensions, questions, resultTypes } from './data'
import type { Answers, Choice, PoleLetter } from './types'

/** 全部题目答同一个选项 */
function answerAll(choice: Choice): Answers {
  const a: Answers = {}
  for (const q of questions) a[q.id] = choice
  return a
}

/** 按目标 4 字母 code 构造作答：每维若目标=第一极→全 A(s=10)，否则→全 B(s=0) */
function answersForCode(code: string): Answers {
  const a: Answers = {}
  dimensions.forEach((dim, i) => {
    const target = code[i] as PoleLetter
    const firstPole = dim.poles[0].letter
    const choice: Choice = target === firstPole ? 'A' : 'B'
    const [start, end] = dim.questionRange
    for (let id = start; id <= end; id++) a[id] = choice
  })
  return a
}

/** 每维前 5 题 A、后 5 题 B → 每维 s=5（临界） */
function answersAllBorderline(): Answers {
  const a: Answers = {}
  for (const dim of dimensions) {
    const [start, end] = dim.questionRange
    for (let id = start; id <= end; id++) {
      a[id] = id - start < 5 ? 'A' : 'B'
    }
  }
  return a
}

describe('scoring 计分引擎（§6）', () => {
  it('全 A → COPT（六边形卷王），无临界', () => {
    const r = score(answerAll('A'))
    expect(r.code).toBe('COPT')
    expect(r.type.name).toBe('六边形卷王')
    expect(r.dimensions.every((d) => d.borderline === false)).toBe(true)
    expect(r.dimensions.every((d) => d.score === 10)).toBe(true)
  })

  it('全 B → XARW（课题组定时炸弹），无临界', () => {
    const r = score(answerAll('B'))
    expect(r.code).toBe('XARW')
    expect(r.type.name).toBe('课题组定时炸弹')
    expect(r.dimensions.every((d) => d.borderline === false)).toBe(true)
    expect(r.dimensions.every((d) => d.score === 0)).toBe(true)
  })

  it('每维恰好 5 分 → 取第二极并标 borderline，得到 XARW', () => {
    const r = score(answersAllBorderline())
    expect(r.code).toBe('XARW')
    expect(r.dimensions.every((d) => d.score === 5)).toBe(true)
    expect(r.dimensions.every((d) => d.borderline === true)).toBe(true)
    expect(r.dimensions.map((d) => d.picked).join('')).toBe('XARW')
  })

  it('poles 不变式：同维两极之和恒为 10，八极总和为 40', () => {
    const r = score(answersForCode('COPW'))
    for (const dim of dimensions) {
      const sum = r.poles[dim.poles[0].letter] + r.poles[dim.poles[1].letter]
      expect(sum).toBe(10)
    }
    const total = Object.values(r.poles).reduce((x, y) => x + y, 0)
    expect(total).toBe(40)
  })

  it('dimensions[].score 等于该维第一极的原始计数', () => {
    const r = score(answersForCode('CAPW'))
    for (const d of r.dimensions) {
      const dim = dimensions.find((x) => x.key === d.key)!
      expect(d.score).toBe(r.poles[dim.poles[0].letter])
    }
  })

  it('16 型覆盖性：每个 results.json 中的 code 都能被命中', () => {
    for (const t of resultTypes) {
      const r = score(answersForCode(t.code))
      expect(r.code).toBe(t.code)
      expect(r.type.code).toBe(t.code)
    }
    expect(resultTypes).toHaveLength(16)
  })

  it('遍历全部 16 种 [C|X][O|A][P|R][T|W] 组合都能查到类型', () => {
    const codes: string[] = []
    for (const c of ['C', 'X'])
      for (const o of ['O', 'A'])
        for (const p of ['P', 'R'])
          for (const t of ['T', 'W']) codes.push(c + o + p + t)
    expect(codes).toHaveLength(16)
    for (const code of codes) {
      const r = score(answersForCode(code))
      expect(r.code).toBe(code)
    }
  })

  it('作答不全 → 抛错', () => {
    const partial: Answers = { 1: 'A' }
    expect(() => score(partial)).toThrow()
  })
})
