import { useLocale } from '../lib/LocaleContext'
// 结尾认真度自评（防污染信号，不计分、不影响结果）+ GeeTest v4（防机器人）。
// 答完所有题后、出证书前出现。GeeTest 仅在配置了 CAPTCHA_ID 时加载（否则无感跳过）。
import { useEffect, useRef } from 'react'
import type { SelfReport } from '../lib/collect'

interface Props {
  onSelect: (sr: SelfReport, turnstileToken: string) => void
}

const OPTIONS: { value: SelfReport; label: 'serious' | 'partial' | 'careless' }[] = [
  { value: 'serious', label: 'serious' },
  { value: 'partial', label: 'partial' },
  { value: 'careless', label: 'careless' },
]

const CAPTCHA_ID = import.meta.env.VITE_GEETEST_CAPTCHA_ID as string | undefined

// 极简 GeeTest v4 类型，避免引入额外类型依赖。
interface Gt4Result {
  lot_number: string
  captcha_output: string
  pass_token: string
  gen_time: string
  captcha_id: string
}
interface Gt4Object {
  showCaptcha: () => void
  onSuccess: (cb: () => void) => void
  getValidate: () => Gt4Result
  destroy: () => void
}
type InitGeetest4 = (
  opts: Record<string, unknown>,
  cb: (obj: Gt4Object) => void,
) => void
function getGt4(): InitGeetest4 | undefined {
  return (window as unknown as { initGeetest4?: InitGeetest4 }).initGeetest4
}

export default function EffortCheck({ onSelect }: Props) {
  const { locale, t } = useLocale()
  const boxRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef<string>('')
  const captchaRef = useRef<Gt4Object | null>(null)

  useEffect(() => {
    if (!CAPTCHA_ID) return
    let cancelled = false

    // 按需注入 GeeTest v4 SDK（只在配置了 CAPTCHA_ID 时加载）。
    if (!document.querySelector('script[data-geetest4]')) {
      const s = document.createElement('script')
      s.src = 'https://static.geetest.com/v4/gt4.js'
      s.async = true
      s.defer = true
      s.dataset.geetest4 = '1'
      document.head.appendChild(s)
    }

    function tryInit() {
      if (cancelled) return
      const init = getGt4()
      if (init) {
        init(
          {
            captchaId: CAPTCHA_ID,
            language: locale === 'zh-CN' ? 'zho' : locale === 'ja' ? 'jpn' : 'eng',
            product: 'bind', // bind 模式：不自动弹出，由代码调用 showCaptcha()
          },
          (obj: Gt4Object) => {
            if (cancelled) {
              obj.destroy()
              return
            }
            captchaRef.current = obj
            obj.onSuccess(() => {
              const result = obj.getValidate()
              tokenRef.current = JSON.stringify(result)
            })
          },
        )
      } else {
        setTimeout(tryInit, 300)
      }
    }
    tryInit()

    return () => {
      cancelled = true
      captchaRef.current?.destroy()
      captchaRef.current = null
    }
  }, [])

  function handleSelect(sr: SelfReport) {
    if (CAPTCHA_ID && captchaRef.current && !tokenRef.current) {
      // 未完成验证则先弹出极验挑战，等 onSuccess 后让用户再选一次
      captchaRef.current.showCaptcha()
      return
    }
    onSelect(sr, tokenRef.current)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-8">
      <div className="border-2 border-ink bg-paper p-6 sm:p-7">
        <p className="font-mono text-xs text-ink/55">{t('lastStep')}</p>
        <h2 className="mt-2 font-display text-xl font-black leading-snug">
          {t('effortTitle')}
        </h2>
        <p className="mt-2 text-[13px] text-ink/60">
          {t('effortNote')}
        </p>

        <div className="mt-5 space-y-2.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleSelect(o.value)}
              className="flex w-full items-center border-2 border-ink bg-paper px-4 py-3 text-left text-[15px] font-bold transition-colors hover:bg-stamp hover:text-white"
            >
              {t(o.label)}
            </button>
          ))}
        </div>

        {/* GeeTest v4 挂载点：bind 模式下为空，由 showCaptcha() 唤起弹层 */}
        <div ref={boxRef} className="mt-4 empty:hidden" />
      </div>
    </div>
  )
}
