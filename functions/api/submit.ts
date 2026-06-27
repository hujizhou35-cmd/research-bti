// POST /api/submit —— 接收一次完整作答，校验后写入 D1。
import { validatePayload } from '../../src/lib/collect'
import { json, sameOrigin, type Env } from '../_shared'

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

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  try {
    await env.DB.prepare(
      `INSERT INTO responses
        (id, created_at, questions_version, mode, consent_version, consent_at, code,
         strength_cx, strength_oa, strength_pr, strength_tw, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
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
        JSON.stringify(p.answers),
      )
      .run()
  } catch {
    return json({ ok: false, error: 'db error' }, 500)
  }

  return json({ ok: true, id })
}
