import { describe, it, expect } from 'vitest'
import { radarVertices } from './RadarChart'
import { score } from '../lib/scoring'
import { questions } from '../lib/data'
import type { Answers, Choice, Poles } from '../lib/types'

function answerAll(choice: Choice): Answers {
  const a: Answers = {}
  for (const q of questions) a[q.id] = choice
  return a
}

/** 把顶点序列量化成一个可比较的指纹（半径序列，保留 1 位小数） */
function fingerprint(poles: Poles): string {
  return radarVertices(poles, 100)
    .map((v) => v.value.toFixed(1))
    .join('|')
}

describe('RadarChart 判别性（§7.8）', () => {
  it('全 C（10/0...）、全 X（0/10...）、平衡（5/5）三种输入画出三种不同形状', () => {
    const allC = score(answerAll('A')).poles // COPT：C/O/P/T = 10
    const allX = score(answerAll('B')).poles // XARW：X/A/R/W = 10

    // 构造 5/5 平衡：每维前 5 题 A、后 5 题 B
    const balancedAnswers: Answers = {}
    for (const q of questions) {
      balancedAnswers[q.id] = (q.id - 1) % 10 < 5 ? 'A' : 'B'
    }
    const balanced = score(balancedAnswers).poles

    const fC = fingerprint(allC)
    const fX = fingerprint(allX)
    const fB = fingerprint(balanced)

    expect(fC).not.toBe(fX)
    expect(fC).not.toBe(fB)
    expect(fX).not.toBe(fB)
  })

  it('全 C 时 C/O/P/T 轴拉满、X/A/R/W 轴为 0', () => {
    const allC = score(answerAll('A')).poles
    const verts = radarVertices(allC, 100)
    const byLetter = Object.fromEntries(verts.map((v) => [v.letter, v.value]))
    for (const l of ['C', 'O', 'P', 'T'] as const) expect(byLetter[l]).toBe(10)
    for (const l of ['X', 'A', 'R', 'W'] as const) expect(byLetter[l]).toBe(0)
  })

  it('平衡（5/5）接近正八边形：八轴半径相等', () => {
    const balancedAnswers: Answers = {}
    for (const q of questions) {
      balancedAnswers[q.id] = (q.id - 1) % 10 < 5 ? 'A' : 'B'
    }
    const balanced = score(balancedAnswers).poles
    const values = radarVertices(balanced, 100).map((v) => v.value)
    expect(values.every((v) => v === 5)).toBe(true)
  })
})
