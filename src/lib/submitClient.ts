// 前端上报：把作答打包后 fire-and-forget POST 到 /api/submit。
// 失败静默（不打扰用户体验）；用 keepalive 让出结果页/跳转也能送达。
import { buildSubmitPayload, type SelfReport } from './collect'
import { questionsVersion } from './data'
import { getClientId } from './clientId'
import type { Answers, DimensionScore, Mode, Question } from './types'

export interface SubmitArgs {
  items: Question[]
  answers: Answers
  flips: Record<number, boolean>
  times: Record<number, number>
  mode: Mode
  code: string
  dimensions: DimensionScore[]
  selfReport: SelfReport
  turnstileToken?: string
  consentVersion: string
  consentAt: string
}

export function submitResponse(args: SubmitArgs): void {
  try {
    const payload = buildSubmitPayload({ ...args, questionsVersion, clientId: getClientId() })
    void fetch('/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* 静默：采集失败不影响用户拿结果 */
    })
  } catch {
    /* 构造失败也静默 */
  }
}
