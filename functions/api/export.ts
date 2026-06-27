// GET /api/export?key=XXX —— 口令保护，下载分析友好的宽表 CSV。
import { buildCsv, type ResponseRow } from '../../src/lib/collect'
import type { Env } from '../_shared'

export async function onRequestGet(context: {
  request: Request
  env: Env
}): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const key = url.searchParams.get('key')

  if (!env.EXPORT_KEY || key !== env.EXPORT_KEY) {
    return new Response('unauthorized', { status: 401 })
  }

  const { results } = await env.DB.prepare(
    'SELECT * FROM responses ORDER BY created_at',
  ).all<ResponseRow>()

  const csv = buildCsv(results)
  const filename = `bti-responses-${new Date().toISOString().slice(0, 10)}.csv`

  // 前置 BOM，确保 Excel 正确识别 UTF-8 中文。
  const BOM = String.fromCharCode(0xfeff)
  return new Response(BOM + csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
