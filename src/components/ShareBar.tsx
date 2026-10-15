import { useLocale } from '../lib/LocaleContext'
import { localizeResult, message, urlFor, type Locale } from '../lib/locale'
// 保存图片 / 复制结果 / 重测。
import { useState, type RefObject } from 'react'
import { toPng } from 'html-to-image'
import type { Mode, ScoreResult } from '../lib/types'

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('导出超时')), ms)),
  ])
}

interface Props {
  mode: Mode
  result: ScoreResult
  serial: string
  captureRef: RefObject<HTMLDivElement>
  /** 切换证书的导出态（展开折叠区 / 关闭动画） */
  onPrepareExport: (exporting: boolean) => void
  onRetake: () => void
}

export function shareText(result: ScoreResult, serial: string, locale: Locale, mode: Mode): string {
  const type = localizeResult(result.type, locale)
  return [
    '【' + message(locale, 'certificate') + '】',
    message(locale, 'model') + ': ' + type.name + ' (' + result.code + ')',
    `「${type.tagline}」`,
    ``,
    type.portrait,
    ``,
    serial + ' · ' + message(locale, 'station'),
    message(locale, 'disclaimer'),
    'https://research-bti.pages.dev/?lang=' + locale + '&v=' + mode,
  ].join('\n')
}

export default function ShareBar({ result, serial, captureRef, onPrepareExport, onRetake, mode }: Props) {
  const { locale, t } = useLocale()
  const [status, setStatus] = useState<string>('')

  async function handleSave() {
    const node = captureRef.current
    if (!node) return
    setStatus(t('generating'))
    onPrepareExport(true)
    try {
      // 等两帧让折叠区展开渲染完，再等字体就绪，避免导出掉字/缺内容
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (document.fonts?.ready) await document.fonts.ready
      // 不把 CJK 字体内联进导出 SVG：体积过大会让 <img> 无法栅格化（整张空白）。
      // 改为 skipFonts，由系统中文字体（各平台都自带）渲染，保证不掉字、内容完整。
      const dataUrl = await withTimeout(
        toPng(node, {
          pixelRatio: 2,
          backgroundColor: '#ECEAE3',
          skipFonts: true,
        }),
        20000,
      )
      const link = document.createElement('a')
      link.download = t('imageName') + '-' + result.code + '.png'
      link.href = dataUrl
      link.click()
      setStatus(t('saved'))
    } catch {
      setStatus(t('saveFailed'))
    } finally {
      onPrepareExport(false)
      window.setTimeout(() => setStatus(''), 2600)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText(result, serial, locale, mode))
      setStatus(t('copied'))
    } catch {
      setStatus(t('copyFailed'))
    }
    window.setTimeout(() => setStatus(''), 2600)
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-[440px]">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="border-2 border-ink bg-stamp px-3 py-2.5 font-display text-sm font-bold text-white active:translate-y-px"
        >
          {t('save')}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="border-2 border-ink bg-paper px-3 py-2.5 font-display text-sm font-bold active:translate-y-px"
        >
          {t('copy')}
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="border-2 border-ink bg-paper px-3 py-2.5 font-display text-sm font-bold active:translate-y-px"
        >
          {t('retake')}
        </button>
      </div>
      <a
        href={urlFor(locale, true)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block w-full border-2 border-ink bg-paper px-3 py-2.5 text-center font-display text-sm font-bold transition-transform active:translate-y-px hover:bg-paper-2"
      >
        📖 {t('otherTypes')}
      </a>
      <p className="mt-2 min-h-4 text-center font-mono text-xs text-ink/60" aria-live="polite">
        {status}
      </p>
    </div>
  )
}
