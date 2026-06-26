// 计分引擎（§4 polarity-graded-5）。逻辑写死在这里，配 vitest 单测。
// 公式对娱乐版(每维 10 题)与严谨版(每维 20 题)通用：strength = raw/(4*n)*10。
import { dimensions, resultTypes } from './data'
import type {
  Answers,
  DimensionScore,
  PoleLetter,
  Poles,
  Question,
  ScoreResult,
} from './types'

const ALL_POLES: PoleLetter[] = ['C', 'X', 'O', 'A', 'P', 'R', 'T', 'W']
const BORDERLINE_BAND = 0.75 // |strength-5| <= 0.75 标 borderline（来自 dimensions.json）

/** code -> 结果类型，O(1) 查表 */
const typeByCode = new Map(resultTypes.map((t) => [t.code, t]))

function emptyPoles(): Poles {
  return ALL_POLES.reduce((acc, p) => {
    acc[p] = 0
    return acc
  }, {} as Poles)
}

function isValidValue(v: unknown): v is number {
  return v === 0 || v === 1 || v === 2 || v === 3 || v === 4
}

/**
 * 计分。
 * @param items 本次作答的题集（已按版本筛好：娱乐版 40 题 / 严谨版 80 题）。
 * @param answers 题号 -> 所选选项的 value(0..4)，items 中每题都必须有合法作答。
 * @throws 作答不全、value 非法、或拼出的 code 在结果库中找不到时抛错。
 */
export function computeResult(items: Question[], answers: Answers): ScoreResult {
  // 1. 校验：items 每题都有合法 value。
  for (const q of items) {
    const v = answers[q.id]
    if (!isValidValue(v)) {
      throw new Error(`题目 ${q.id} 未作答或 value 非法：${String(v)}`)
    }
  }

  // 2. 按维度归集本维被作答的题。
  const itemsByDim = new Map<string, Question[]>()
  for (const q of items) {
    const arr = itemsByDim.get(q.dimension)
    if (arr) arr.push(q)
    else itemsByDim.set(q.dimension, [q])
  }

  // 3. 逐维计分（顺序固定 CX→OA→PR→TW，由 dimensions 数组保证）。
  const poles = emptyPoles()
  const dimensionScores: DimensionScore[] = []
  let code = ''
  for (const dim of dimensions) {
    const dimItems = itemsByDim.get(dim.key) ?? []
    const n = dimItems.length
    if (n === 0) {
      throw new Error(`维度 ${dim.key} 没有任何作答题目`)
    }
    const firstPole = dim.firstPole.key
    const secondPole = dim.secondPole.key

    const raw = dimItems.reduce((s, q) => s + answers[q.id], 0)
    const strength = (raw / (4 * n)) * 10 // 第一极强度 ∈ [0,10]
    const picked = strength > 5 ? firstPole : secondPole // =5 归第二极(保守极)
    const borderline = Math.abs(strength - 5) <= BORDERLINE_BAND

    poles[firstPole] = strength
    poles[secondPole] = 10 - strength

    dimensionScores.push({ key: dim.key, raw, strength, picked, borderline })
    code += picked
  }

  // 4. 查结果库。
  const type = typeByCode.get(code)
  if (!type) {
    throw new Error(`找不到对应类型 code：${code}（理论上 16 型应全覆盖）`)
  }

  // 5. 输出。
  return { code, type, dimensions: dimensionScores, poles }
}
