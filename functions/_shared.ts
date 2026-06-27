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
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
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
