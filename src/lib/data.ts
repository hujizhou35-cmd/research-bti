// 唯一数据源的「类型化入口」：所有逻辑/组件只从这里读 data/*.json。
import dimensionsJson from '../../data/dimensions.json'
import questionsJson from '../../data/questions.json'
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
export const questionsFile = questionsJson as QuestionsFile
export const resultsFile = resultsJson as ResultsFile

export const dimensions: Dimension[] = dimensionsFile.dimensions
export const questions: Question[] = questionsFile.questions
export const resultTypes: ResultType[] = resultsFile.types

export const disclaimer: string = resultsFile.disclaimer
export const privacyNote: string = resultsFile.privacyNote
