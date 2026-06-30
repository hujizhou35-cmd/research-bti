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
  /** GeeTest v4 私钥（captchaKey，设了才校验；不设则 turnstile=disabled） */
  GEETEST_KEY?: string
  /** 设为 "1" 时硬拦非 pass 的提交；默认仅记录(flag 模式)，避免极验加载失败误杀 */
  TURNSTILE_ENFORCE?: string
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

/** 校验 GeeTest v4 令牌。返回 true=人类验证通过。
 *  tokenJson: 前端 JSON.stringify({ lot_number, captcha_output, pass_token, gen_time, captcha_id })
 *  captchaKey: GeeTest 后台私钥
 */
export async function verifyGeetest(
  tokenJson: string,
  captchaKey: string,
): Promise<boolean> {
  try {
    const { lot_number, captcha_output, pass_token, gen_time, captcha_id } =
      JSON.parse(tokenJson) as Record<string, string>

    // HMAC-SHA256(lot_number, captchaKey) → hex → sign_token
    const keyBytes = new TextEncoder().encode(captchaKey)
    const msgBytes = new TextEncoder().encode(lot_number)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes)
    const sign_token = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const form = new URLSearchParams({
      lot_number,
      captcha_output,
      pass_token,
      gen_time,
      sign_token,
    })
    const r = await fetch(
      `https://gcaptcha4.geetest.com/validate?captcha_id=${encodeURIComponent(captcha_id)}`,
      { method: 'POST', body: form },
    )
    const data = (await r.json()) as { result?: string }
    return data.result === 'success'
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
