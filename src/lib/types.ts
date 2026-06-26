// 题库 / 结果库的 TS 类型，与 data/*.json 对齐。
// 数据是唯一数据源，这里只描述结构，不复制内容。

/** 四个维度的 key */
export type DimensionKey = 'CX' | 'OA' | 'PR' | 'TW'

/** 八个极字母 */
export type PoleLetter = 'C' | 'X' | 'O' | 'A' | 'P' | 'R' | 'T' | 'W'

/** 选项 */
export type Choice = 'A' | 'B'

// ---- data/dimensions.json ----
export interface Pole {
  letter: PoleLetter
  label: string
  short: string
  desc: string
}

export interface Dimension {
  key: DimensionKey
  name: string
  /** [起始题号, 结束题号]，闭区间 */
  questionRange: [number, number]
  /** [第一极(aPole), 第二极(bPole)] */
  poles: [Pole, Pole]
}

export interface DimensionsFile {
  version: string
  note: string
  dimensions: Dimension[]
}

// ---- data/questions.json ----
export interface Question {
  id: number
  dimension: DimensionKey
  aPole: PoleLetter
  bPole: PoleLetter
  text: string
  optionA: string
  optionB: string
  // V1.3 起每题带一个主题标签（仅元数据，逻辑不依赖）
  theme?: string
}

export interface QuestionsFile {
  version: string
  guidance: string
  // 题库 V1.0 用 scoring 字段；V1.3 改为 scoringModel/scoringNote（均为说明性元数据，逻辑只读 questions）
  scoring?: string
  scoringModel?: string
  scoringNote?: string
  basis?: string
  optionOrderRandomization?: string
  knownLimitations?: string
  questions: Question[]
}

// ---- data/results.json ----
export interface ResultType {
  code: string
  name: string
  tagline: string
  letters: PoleLetter[]
  vibe: string
  portrait: string
  pros: string[]
  cons: string[]
  mentorStrategy: string
  mentorActions: string[]
  mentorTips: string[]
}

export interface ResultsFile {
  version: string
  privacyNote: string
  disclaimer: string
  types: ResultType[]
}

// ---- 计分输出（§6） ----

/** 用户作答：题号 -> 'A' | 'B' */
export type Answers = Record<number, Choice>

/** 单维度结果，用于文字/条 */
export interface DimensionScore {
  key: DimensionKey
  /** 命中的极字母 */
  picked: PoleLetter
  /** 第一极(A)的个数，0..10 */
  score: number
  /** 是否处于 5/5 临界（取更保守一极） */
  borderline: boolean
}

/** 八极原始计数，同维两极之和恒为 10，供雷达图用 */
export type Poles = Record<PoleLetter, number>

export interface ScoreResult {
  code: string
  type: ResultType
  dimensions: DimensionScore[]
  poles: Poles
}
