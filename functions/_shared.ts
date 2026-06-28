// Pages Functions 共享辅助。下划线前缀文件不会成为路由。
// 仅声明用到的最小 D1 类型，避免引入 @cloudflare/workers-types 依赖。

export interface D1Result<T = unknown> {
  results: T[]
  success: boolean
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  run(): Promise<D1Result>
  all<T = unknown>(): Promise<D1Result<T>>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

export interface Env {
  /** D1 绑定（dashboard / wrangler.toml 配置 binding=DB） */
  DB: D1Database
  /** 导出口令（dashboard 环境变量） */
  EXPORT_KEY?: string
  /** Cloudflare Turnstile 私钥（设了才校验；不设则 turnstile=disabled） */
  TURNSTILE_SECRET?: string
  /** 设为 "1" 时硬拦非 pass 的提交；默认仅记录(flag 模式)，避免国内加载失败误杀 */
  TURNSTILE_ENFORCE?: string
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

/** 校验 Cloudflare Turnstile 令牌。返回 true=人类验证通过。 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
): Promise<boolean> {
  try {
    const form = new URLSearchParams()
    form.append('secret', secret)
    form.append('response', token)
    if (ip) form.append('remoteip', ip)
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const data = (await r.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

/** 仅接受同源提交（缺 Origin 头的同源导航放行），轻量挡掉跨站脚本刷库。 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}
