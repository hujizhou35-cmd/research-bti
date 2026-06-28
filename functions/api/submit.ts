// POST /api/submit —— 接收一次完整作答，校验后写入 D1。
import { validatePayload } from '../../src/lib/collect'
import { json, sameOrigin, verifyTurnstile, type Env } from '../_shared'

export async function onRequestPost(context: {
  request: Request
  env: Env
}): Promise<Response> {
  const { request, env } = context

  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden origin' }, 403)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400)
  }

  const res = validatePayload(body)
  if (!res.ok) return json({ ok: false, error: res.error }, 400)
  const p = res.value

  // Turnstile 防机器人：设了私钥才校验。默认 flag 模式（仅记录结果）；
  // 设 TURNSTILE_ENFORCE=1 时硬拦非 pass（注意国内加载失败可能误杀）。
  let turnstile = 'disabled'
  if (env.TURNSTILE_SECRET) {
    if (!p.turnstileToken) {
      turnstile = 'absent'
    } else {
      const ok = await verifyTurnstile(p.turnstileToken, env.TURNSTILE_SECRET, request.headers.get('CF-Connecting-IP'))
      turnstile = ok ? 'pass' : 'fail'
    }
    if (env.TURNSTILE_ENFORCE === '1' && turnstile !== 'pass') {
      return json({ ok: false, error: 'turnstile failed' }, 403)
    }
  }

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  try {
    await env.DB.prepare(
      `INSERT INTO responses
        (id, client_id, created_at, questions_version, mode, consent_version, consent_at, code,
         strength_cx, strength_oa, strength_pr, strength_tw, duration_ms, self_report, turnstile, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        p.clientId,
        createdAt,
        p.questionsVersion,
        p.mode,
        p.consentVersion,
        p.consentAt,
        p.code,
        p.strengths.CX,
        p.strengths.OA,
        p.strengths.PR,
        p.strengths.TW,
        p.durationMs,
        p.selfReport,
        turnstile,
        JSON.stringify(p.answers),
      )
      .run()
  } catch {
    return json({ ok: false, error: 'db error' }, 500)
  }

  return json({ ok: true, id })
}
