// 数据采集的「纯逻辑」层：构造上报载荷、服务端校验、导出 CSV。
// 不依赖浏览器/Cloudflare/数据文件，故可被前端、Pages Functions 与 vitest 共用。
import type { Answers, DimensionScore, Mode, Question } from './types'

const MARKERS = ['A', 'B', 'C', 'D', 'E'] as const

/**
 * 由「选项 value(0..4)」与「该题是否整组翻转」反推屏幕位置 A–E（方法学核查用）。
 * 未翻转：选项按 value 4→0 呈现，value=v 落在第 (4-v) 行；翻转：按 0→4，落在第 v 行。
 */
export function posOf(value: number, flipped: boolean): string {
  const idx = flipped ? value : 4 - value
  return MARKERS[idx] ?? '?'
}

/** 自评作答认真度（防污染信号，不计分） */
export type SelfReport = 'serious' | 'partial' | 'careless'
const SELF_REPORTS: SelfReport[] = ['serious', 'partial', 'careless']

/** 单题上报明细：v=所选 value，pole=极标签，flipped=是否翻转，pos=屏幕位置，t=该题用时(ms) */
export interface AnswerDetail {
  v: number
  pole: string
  flipped: boolean
  pos: string
  t?: number
}

export interface SubmitPayload {
  questionsVersion: string
  /** 匿名浏览器随机串，用于去重 / 识别重复提交（非个人信息） */
  clientId: string
  mode: Mode
  consentVersion: string
  consentAt: string
  code: string
  strengths: { CX: number; OA: number; PR: number; TW: number }
  /** 作答总用时(ms)，各题用时之和（防污染：筛速答者） */
  durationMs: number
  /** 结尾自评认真度（防污染） */
  selfReport: SelfReport
  /** Cloudflare Turnstile 令牌（防机器人）；仅用于服务端校验，不入库原文 */
  turnstileToken?: string
  answers: Record<string, AnswerDetail>
}

/** 前端：把一次完整作答打包成上报载荷（纯函数，便于测试）。 */
export function buildSubmitPayload(args: {
  items: Question[]
  answers: Answers
  flips: Record<number, boolean>
  times: Record<number, number>
  mode: Mode
  code: string
  dimensions: DimensionScore[]
  selfReport: SelfReport
  turnstileToken?: string
  questionsVersion: string
  clientId: string
  consentVersion: string
  consentAt: string
}): SubmitPayload {
  const strengths = { CX: 0, OA: 0, PR: 0, TW: 0 }
  for (const d of args.dimensions) {
    if (d.key in strengths) strengths[d.key] = d.strength
  }

  const answers: Record<string, AnswerDetail> = {}
  let durationMs = 0
  for (const q of args.items) {
    const v = args.answers[q.id]
    const opt = q.options.find((o) => o.value === v)
    const flipped = !!args.flips[q.id]
    const t = args.times[q.id]
    if (typeof t === 'number' && Number.isFinite(t)) durationMs += t
    answers[String(q.id)] = {
      v,
      pole: opt ? opt.pole : 'mid',
      flipped,
      pos: posOf(v, flipped),
      ...(typeof t === 'number' && Number.isFinite(t) ? { t: Math.round(t) } : {}),
    }
  }

  return {
    questionsVersion: args.questionsVersion,
    clientId: args.clientId,
    mode: args.mode,
    consentVersion: args.consentVersion,
    consentAt: args.consentAt,
    code: args.code,
    strengths,
    durationMs: Math.round(durationMs),
    selfReport: args.selfReport,
    ...(args.turnstileToken ? { turnstileToken: args.turnstileToken } : {}),
    answers,
  }
}

type Validated = { ok: true; value: SubmitPayload } | { ok: false; error: string }
const fail = (error: string): Validated => ({ ok: false, error })

/** 服务端：对收到的 body 做运行时校验，挡掉脏数据/恶意提交。 */
export function validatePayload(body: unknown): Validated {
  if (typeof body !== 'object' || body === null) return fail('payload 不是对象')
  const b = body as Record<string, unknown>

  if (b.mode !== 'fun' && b.mode !== 'strict') return fail('mode 非法')
  if (typeof b.questionsVersion !== 'string' || !b.questionsVersion) return fail('questionsVersion 缺失')
  if (typeof b.clientId !== 'string' || !b.clientId || b.clientId.length > 64) return fail('clientId 非法')
  if (typeof b.code !== 'string' || b.code.length !== 4) return fail('code 非法')
  if (typeof b.consentVersion !== 'string' || !b.consentVersion) return fail('未记录知情同意版本')
  if (typeof b.consentAt !== 'string' || !b.consentAt) return fail('未记录同意时间')
  if (typeof b.durationMs !== 'number' || !Number.isFinite(b.durationMs) || b.durationMs < 0)
    return fail('durationMs 非法')
  if (typeof b.selfReport !== 'string' || !SELF_REPORTS.includes(b.selfReport as SelfReport))
    return fail('selfReport 非法')
  if (b.turnstileToken !== undefined && typeof b.turnstileToken !== 'string') return fail('turnstileToken 非法')

  const s = b.strengths
  if (typeof s !== 'object' || s === null) return fail('strengths 缺失')
  const sv = s as Record<string, unknown>
  for (const k of ['CX', 'OA', 'PR', 'TW']) {
    if (typeof sv[k] !== 'number' || !Number.isFinite(sv[k])) return fail('strengths.' + k + ' 非法')
  }

  const a = b.answers
  if (typeof a !== 'object' || a === null) return fail('answers 缺失')
  const entries = Object.entries(a as Record<string, unknown>)
  const expected = b.mode === 'fun' ? 40 : 80
  if (entries.length !== expected) return fail(`answers 数量应为 ${expected}，实际 ${entries.length}`)

  for (const [id, d] of entries) {
    if (!/^\d+$/.test(id)) return fail('题号非法:' + id)
    if (typeof d !== 'object' || d === null) return fail('答案项非法:' + id)
    const dd = d as Record<string, unknown>
    if (typeof dd.v !== 'number' || ![0, 1, 2, 3, 4].includes(dd.v)) return fail('value 非法:' + id)
    if (typeof dd.flipped !== 'boolean') return fail('flipped 非法:' + id)
    if (typeof dd.pos !== 'string' || dd.pos.length !== 1 || !'ABCDE'.includes(dd.pos)) return fail('pos 非法:' + id)
    if (typeof dd.pole !== 'string') return fail('pole 非法:' + id)
    if (dd.t !== undefined && (typeof dd.t !== 'number' || !Number.isFinite(dd.t))) return fail('t 非法:' + id)
    // pos 自洽校验：屏幕位置必须与 value+flipped 推出的一致，挡掉伪造载荷。
    if (dd.pos !== posOf(dd.v as number, dd.flipped as boolean)) return fail('pos 不自洽:' + id)
  }

  return { ok: true, value: b as unknown as SubmitPayload }
}

/** D1 行（与 schema.sql 对齐） */
export interface ResponseRow {
  id: string
  client_id: string | null
  created_at: string
  questions_version: string
  mode: string
  consent_version: string
  consent_at: string
  code: string
  strength_cx: number
  strength_oa: number
  strength_pr: number
  strength_tw: number
  duration_ms: number | null
  self_report: string | null
  /** Turnstile 校验结果：pass|fail|absent|disabled（防机器人信号） */
  turnstile: string | null
  answers: string // JSON 字符串
}

function csvCell(x: unknown): string {
  const s = x == null ? '' : String(x)
  return '"' + s.replace(/"/g, '""') + '"'
}

/**
 * 导出分析友好的「宽表」CSV：一行一个受试者，q1..q80 为所选 value（未答留空），
 * 末列 answers_json 保留完整明细（含 pole/flipped/pos）供方法学核查。
 */
export function buildCsv(rows: ResponseRow[]): string {
  const qNums = Array.from({ length: 80 }, (_, i) => i + 1)
  const header = [
    'id', 'client_id', 'created_at', 'questions_version', 'mode', 'consent_version', 'consent_at', 'code',
    'strength_cx', 'strength_oa', 'strength_pr', 'strength_tw',
    'duration_ms', 'self_report', 'turnstile',
    ...qNums.map((n) => 'q' + n),
    'answers_json',
  ]
  const lines = [header.map(csvCell).join(',')]

  for (const r of rows) {
    let ans: Record<string, { v?: number }> = {}
    try {
      ans = JSON.parse(r.answers) as Record<string, { v?: number }>
    } catch {
      ans = {}
    }
    const qVals = qNums.map((n) => {
      const d = ans[String(n)]
      return d && typeof d.v === 'number' ? String(d.v) : ''
    })
    const row = [
      r.id, r.client_id, r.created_at, r.questions_version, r.mode, r.consent_version, r.consent_at, r.code,
      r.strength_cx, r.strength_oa, r.strength_pr, r.strength_tw,
      r.duration_ms, r.self_report, r.turnstile,
      ...qVals,
      r.answers,
    ]
    lines.push(row.map(csvCell).join(','))
  }

  return lines.join('\r\n') + '\r\n'
}
