// 结尾认真度自评（防污染信号，不计分、不影响结果）+ Cloudflare Turnstile（防机器人）。
// 答完所有题后、出证书前出现。Turnstile 仅在配置了 Site Key 时加载（否则无感跳过）。
import { useEffect, useRef } from 'react'
import type { SelfReport } from '../lib/collect'

interface Props {
  onSelect: (sr: SelfReport, turnstileToken: string) => void
}

const OPTIONS: { value: SelfReport; label: string }[] = [
  { value: 'serious', label: '认真完成的' },
  { value: 'partial', label: '大致认真，个别题随便选了' },
  { value: 'careless', label: '基本是随便选的' },
]

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

// 极简 Turnstile 类型，避免引入额外类型依赖。
interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
}
function getTs(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile
}

export default function EffortCheck({ onSelect }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef<string>('')
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    // 按需注入 Turnstile 脚本（只在配置了 Site Key 时加载）。
    if (!document.querySelector('script[data-turnstile]')) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.defer = true
      s.dataset.turnstile = '1'
      document.head.appendChild(s)
    }

    function tryRender() {
      if (cancelled) return
      const ts = getTs()
      if (ts && boxRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = ts.render(boxRef.current, {
          sitekey: SITE_KEY,
          callback: (t: string) => {
            tokenRef.current = t
          },
          'expired-callback': () => {
            tokenRef.current = ''
          },
          'error-callback': () => {
            tokenRef.current = ''
          },
        })
      } else if (!ts) {
        setTimeout(tryRender, 300)
      }
    }
    tryRender()

    return () => {
      cancelled = true
      const ts = getTs()
      if (ts && widgetIdRef.current !== null) {
        try {
          ts.remove(widgetIdRef.current)
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-8">
      <div className="border-2 border-ink bg-paper p-6 sm:p-7">
        <p className="font-mono text-xs text-ink/55">最后一步 · 不影响你的结果</p>
        <h2 className="mt-2 font-display text-xl font-black leading-snug">
          为保证研究质量，请如实选择：你刚才的作答是——
        </h2>
        <p className="mt-2 text-[13px] text-ink/60">
          无论选哪项都会照常出具鉴定证书，此项仅用于数据质量核查、不计入结果。
        </p>

        <div className="mt-5 space-y-2.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value, tokenRef.current)}
              className="flex w-full items-center border-2 border-ink bg-paper px-4 py-3 text-left text-[15px] font-bold transition-colors hover:bg-stamp hover:text-white"
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Turnstile 容器：仅在配置 Site Key 时渲染，多数情况无感 */}
        <div ref={boxRef} className="mt-4 empty:hidden" />
      </div>
    </div>
  )
}
