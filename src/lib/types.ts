// 题库 / 结果库的 TS 类型，与 data/*.json 对齐。
// 数据是唯一数据源，这里只描述结构，不复制内容。
// V2.0：题库由「双极迫选 2 选项」升级为「极性五级 5 选项」(polarity-graded-5)。

/** 四个维度的 key */
export type DimensionKey = 'CX' | 'OA' | 'PR' | 'TW'

/** 八个极字母 */
export type PoleLetter = 'C' | 'X' | 'O' | 'A' | 'P' | 'R' | 'T' | 'W'

/** 每维「第一极」字母（指向 value=4 的一端） */
export type FirstPole = 'C' | 'O' | 'P' | 'T'
/** 每维「第二极」字母（指向 value=0 的一端） */
export type SecondPole = 'X' | 'A' | 'R' | 'W'

/** 选项的极标签：八极之一，或辩证/健康中间项 */
export type Pole = PoleLetter | 'mid'

/** 选项指向第一极的分值（4=强第一极 … 0=强第二极） */
export type OptionValue = 0 | 1 | 2 | 3 | 4

// ---- data/dimensions.json（polarity-graded-5 结构，见 CLAUDE.md §4） ----
export interface DimensionPole {
  key: PoleLetter
  name: string
}

export interface Dimension {
  key: DimensionKey
  name: string
  firstPole: DimensionPole
  secondPole: DimensionPole
  /** OA / TW 维的中间项(value=2)语义：健康边界 / 健康止损 */
  mid?: string
}

export interface DimensionsFile {
  scoringModel: string
  /** |strength-5| <= borderlineBand 判 borderline */
  borderlineBand: number
  dimensions: Dimension[]
}

// ---- data/questionsv5.json ----
export interface Option {
  text: string
  pole: Pole
  /** 指向第一极的分值，计分只看 value，pole 仅用于诊断/分类 */
  value: OptionValue
}

export interface Question {
  id: number
  dimension: DimensionKey
  firstPole: FirstPole
  secondPole: SecondPole
  theme: string
  /** priority=1 进入娱乐版(40 题) */
  priority: 0 | 1
  text: string
  /** 恒 5 项，value 必为 {0,1,2,3,4} 各一 */
  options: Option[]
}

export interface QuestionsFile {
  version: string
  basis?: string
  scoringModel?: string
  scoringNote?: string
  optionPresentationRandomization?: string
  itemSampling?: string
  guidance: string
  knownLimitations?: string
  noModeration?: string
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

// ---- 计分输入/输出（§4 polarity-graded-5） ----

/** 测验版本：娱乐版(每维10题) / 严谨版(每维20题) */
export type Mode = 'fun' | 'strict'

/** 用户作答：题号 -> 所选选项的 value(0..4) */
export type Answers = Record<number, OptionValue>

/** 八极强度，同维两极之和恒为 10，供雷达图用 */
export type Poles = Record<PoleLetter, number>

/** 单维度计分结果 */
export interface DimensionScore {
  key: DimensionKey
  /** 本维所有题 value 之和 */
  raw: number
  /** 第一极强度 ∈ [0,10] */
  strength: number
  /** 命中的极字母（strength>5 取第一极，否则第二极） */
  picked: PoleLetter
  /** |strength-5| <= borderlineBand：倾向辩证、不极端 */
  borderline: boolean
}

export interface ScoreResult {
  code: string
  type: ResultType
  dimensions: DimensionScore[]
  poles: Poles
}
