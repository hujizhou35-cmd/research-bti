// 唯一数据源的「类型化入口」：所有逻辑/组件只从这里读 data/*.json。
// V2.0：题库切换到 data/questionsv4.json（80 题，polarity-graded-5）。
// 旧的 data/questions.json（V1.3 双极迫选）已弃用，禁止再引用。
import dimensionsJson from '../../data/dimensions.json'
import questionsJson from '../../data/questionsv4.json'
import resultsJson from '../../data/results.json'
import type {
  DimensionsFile,
  QuestionsFile,
  ResultsFile,
  Dimension,
  Question,
  ResultType,
} from './types'

export const dimensionsFile = dimensionsJson as DimensionsFile
export const questionsFile = questionsJson as unknown as QuestionsFile
export const resultsFile = resultsJson as ResultsFile

export const dimensions: Dimension[] = dimensionsFile.dimensions
export const questions: Question[] = questionsFile.questions
export const resultTypes: ResultType[] = resultsFile.types

/** 娱乐版题集：每维 priority===1 各 10 题，共 40 题 */
export const funQuestions: Question[] = questions.filter((q) => q.priority === 1)

export const disclaimer: string = resultsFile.disclaimer
export const privacyNote: string = resultsFile.privacyNote
