// 计分引擎（§6）。逻辑写死在这里，配 vitest 单测。
import { dimensions, questions, resultTypes } from './data'
import type {
  Answers,
  DimensionScore,
  PoleLetter,
  Poles,
  ScoreResult,
} from './types'

const ALL_POLES: PoleLetter[] = ['C', 'X', 'O', 'A', 'P', 'R', 'T', 'W']

/** 题号 -> 题目，便于按答案累计极计数 */
const questionById = new Map(questions.map((q) => [q.id, q]))

/** code -> 结果类型，O(1) 查表 */
const typeByCode = new Map(resultTypes.map((t) => [t.code, t]))

function emptyPoles(): Poles {
  return ALL_POLES.reduce((acc, p) => {
    acc[p] = 0
    return acc
  }, {} as Poles)
}

/**
 * 计分。
 * @param answers 40 题作答（题号 -> 'A' | 'B'），必须答满。
 * @throws 作答不全、题号未知、或拼出的 code 在结果库中找不到时抛错。
 */
export function score(answers: Answers): ScoreResult {
  // 1. 每题 A → aPole +1；B → bPole +1，累计八极原始计数。
  const poles = emptyPoles()
  for (const q of questions) {
    const choice = answers[q.id]
    if (choice !== 'A' && choice !== 'B') {
      throw new Error(`题目 ${q.id} 未作答或作答非法：${String(choice)}`)
    }
    const pole = choice === 'A' ? q.aPole : q.bPole
    poles[pole] += 1
  }
  // 防御：答案里若含未知题号，也视为非法输入（避免脏数据被静默吞掉）。
  for (const id of Object.keys(answers)) {
    if (!questionById.has(Number(id))) {
      throw new Error(`未知题号：${id}`)
    }
  }

  // 2. 每维 10 题，统计第一极得分 s（A 的个数 0..10）并判极。
  const dimensionScores: DimensionScore[] = []
  let code = ''
  for (const dim of dimensions) {
    const firstPole = dim.poles[0].letter
    const secondPole = dim.poles[1].letter
    const s = poles[firstPole] // 第一极(A)的个数

    let picked: PoleLetter
    let borderline = false
    if (s > 5) {
      picked = firstPole
    } else if (s < 5) {
      picked = secondPole
    } else {
      // s === 5：平局取第二极（更保守的一极），并标记临界。
      picked = secondPole
      borderline = true
    }

    dimensionScores.push({ key: dim.key, picked, score: s, borderline })
    code += picked
  }

  // 3. 查结果库。
  const type = typeByCode.get(code)
  if (!type) {
    throw new Error(`找不到对应类型 code：${code}（理论上 16 型应全覆盖）`)
  }

  // 4. 输出。
  return { code, type, dimensions: dimensionScores, poles }
}
