import { describe, expect, it } from 'vitest'
import { onRequestPost } from '../../functions/api/submit'
import { onRequestGet } from '../../functions/api/export'
import type { Env } from '../../functions/_shared'
import { buildSubmitPayload } from './collect'
import { funQuestions } from './data'
import { computeResult } from './scoring'
import type { Answers } from './types'

function fixture() {
  const answers = Object.fromEntries(funQuestions.map(q => [q.id, 2])) as Answers
  const result = computeResult(funQuestions, answers)
  return buildSubmitPayload({ items: funQuestions, answers, flips: {}, times: {}, mode: 'fun', code: result.code, dimensions: result.dimensions, selfReport: 'serious', questionsVersion: '2.1', clientId: 'synthetic-api-test', consentVersion: 'v2', consentAt: '2026-10-15T00:00:00Z' })
}
function database() {
  let sql = '', values: unknown[] = []
  const statement = { bind: (...v: unknown[]) => { values = v; return statement }, run: async () => ({ success: true, results: [] }), all: async <T,>() => ({ success: true, results: [] as T[] }) }
  const env: Env = { DB: { prepare: (s: string) => { sql = s; return statement } } }
  return { env, query: () => sql, values: () => values }
}
function request(payload: unknown, origin = 'https://example.test') {
  return new Request('https://example.test/api/submit', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(payload) })
}
describe('collection API compatibility', () => {
  it('binds explicit language metadata and historical nulls to the additive schema', async () => {
    for (const extra of [{}, { locale: 'ja', translationVersion: '2026-10-15.1' }]) {
      const db = database()
      const response = await onRequestPost({ request: request({ ...fixture(), ...extra }), env: db.env })
      expect(response.status).toBe(200)
      expect(db.query()).toContain('locale, translation_version')
      expect(db.values().length).toBe(18)
      expect(db.values().slice(-2)).toEqual('locale' in extra ? ['ja', '2026-10-15.1'] : [null, null])
    }
  })
  it('does not write malformed language or cross-origin submissions', async () => {
    const db = database()
    expect((await onRequestPost({ request: request({ ...fixture(), locale: 'xx', translationVersion: 'x' }), env: db.env })).status).toBe(400)
    expect((await onRequestPost({ request: request(fixture(), 'https://other.test'), env: db.env })).status).toBe(403)
    expect(db.query()).toBe('')
  })
  it('keeps exports protected and includes appended language columns for authorized owners', async () => {
    const db = database()
    expect((await onRequestGet({ request: new Request('https://example.test/api/export'), env: db.env })).status).toBe(401)
    db.env.EXPORT_KEY = 'synthetic-local-key'
    expect((await onRequestGet({ request: new Request('https://example.test/api/export?key=wrong'), env: db.env })).status).toBe(401)
    const response = await onRequestGet({ request: new Request('https://example.test/api/export?key=synthetic-local-key'), env: db.env })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toContain('"locale","translation_version"')
  })
})
