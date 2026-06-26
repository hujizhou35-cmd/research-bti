import { describe, it, expect } from 'vitest'
import { radarVertices } from './RadarChart'
import { computeResult } from '../lib/scoring'
import { questions } from '../lib/data'
import type { Answers, OptionValue, Poles, Question } from '../lib/types'

function answerAll(items: Question[], value: OptionValue): Answers {
  const a: Answers = {}
  for (const q of items) a[q.id] = value
  return a
}

/** 把顶点序列量化成一个可比较的指纹（半径序列，保留 1 位小数） */
function fingerprint(poles: Poles): string {
  return radarVertices(poles, 100)
    .map((v) => v.value.toFixed(1))
    .join('|')
}

describe('RadarChart 判别性（§6 八向雷达，仅依赖 poles）', () => {
  it('偏第一极(全4)、偏第二极(全0)、平衡(全2) 三种输入画出三种不同形状', () => {
    const first = computeResult(questions, answerAll(questions, 4)).poles // C/O/P/T = 10
    const second = computeResult(questions, answerAll(questions, 0)).poles // X/A/R/W = 10
    const balanced = computeResult(questions, answerAll(questions, 2)).poles // 全 5

    const fA = fingerprint(first)
    const fB = fingerprint(second)
    const fBal = fingerprint(balanced)

    expect(fA).not.toBe(fB)
    expect(fA).not.toBe(fBal)
    expect(fB).not.toBe(fBal)
  })

  it('偏第一极时 C/O/P/T 轴拉满(10)、X/A/R/W 轴为 0', () => {
    const first = computeResult(questions, answerAll(questions, 4)).poles
    const verts = radarVertices(first, 100)
    const byLetter = Object.fromEntries(verts.map((v) => [v.letter, v.value]))
    for (const l of ['C', 'O', 'P', 'T'] as const) expect(byLetter[l]).toBe(10)
    for (const l of ['X', 'A', 'R', 'W'] as const) expect(byLetter[l]).toBe(0)
  })

  it('平衡(全2 → strength=5)接近正八边形：八轴半径相等(=5)', () => {
    const balanced = computeResult(questions, answerAll(questions, 2)).poles
    const values = radarVertices(balanced, 100).map((v) => v.value)
    expect(values.every((v) => v === 5)).toBe(true)
  })

  it('娱乐版与严谨版同一倾向(全3)雷达形状一致', () => {
    const fun = computeResult(
      questions.filter((q) => q.priority === 1),
      answerAll(
        questions.filter((q) => q.priority === 1),
        3,
      ),
    ).poles
    const strict = computeResult(questions, answerAll(questions, 3)).poles
    expect(fingerprint(fun)).toBe(fingerprint(strict))
  })
})
