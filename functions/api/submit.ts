// POST /api/submit —— 接收一次完整作答，校验后写入 D1。
import { validatePayload } from '../../src/lib/collect'
import { json, sameOrigin, verifyGeetest, type Env } from '../_shared'

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

  // GeeTest v4 防机器人：设了私钥才校验。默认 flag 模式（仅记录结果）；
  // 设 TURNSTILE_ENFORCE=1 时硬拦非 pass（注意极验加载失败可能误杀）。
  let turnstile = 'disabled'
  if (env.GEETEST_KEY) {
    if (!p.turnstileToken) {
      turnstile = 'absent'
    } else {
      const ok = await verifyGeetest(p.turnstileToken, env.GEETEST_KEY)
      turnstile = ok ? 'pass' : 'fail'
    }
    if (env.TURNSTILE_ENFORCE === '1' && turnstile !== 'pass') {
      return json({ ok: false, error: 'captcha failed' }, 403)
    }
  }

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  try {
    await env.DB.prepare(
      `INSERT INTO responses
        (id, client_id, created_at, questions_version, mode, consent_version, consent_at, code,
         strength_cx, strength_oa, strength_pr, strength_tw, duration_ms, self_report, turnstile, answers,
         locale, translation_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        p.locale ?? null,
        p.translationVersion ?? null,
      )
      .run()
  } catch {
    return json({ ok: false, error: 'db error' }, 500)
  }

  return json({ ok: true, id })
}
