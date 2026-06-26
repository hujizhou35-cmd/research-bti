// 保存图片 / 复制结果 / 重测。
import { useState, type RefObject } from 'react'
import { toPng } from 'html-to-image'
import type { ScoreResult } from '../lib/types'
import { disclaimer } from '../lib/data'

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('导出超时')), ms)),
  ])
}

interface Props {
  result: ScoreResult
  serial: string
  captureRef: RefObject<HTMLDivElement>
  /** 切换证书的导出态（展开折叠区 / 关闭动画） */
  onPrepareExport: (exporting: boolean) => void
  onRetake: () => void
}

function shareText(result: ScoreResult, serial: string): string {
  const { type } = result
  return [
    `【科研牛马人格鉴定证书】`,
    `型号：${type.name}（${result.code}）`,
    `「${type.tagline}」`,
    ``,
    type.portrait,
    ``,
    `${serial} · 课题组牛马人格鉴定所`,
    disclaimer,
  ].join('\n')
}

export default function ShareBar({ result, serial, captureRef, onPrepareExport, onRetake }: Props) {
  const [status, setStatus] = useState<string>('')

  async function handleSave() {
    const node = captureRef.current
    if (!node) return
    setStatus('生成中…')
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
      link.download = `科研牛马鉴定证书-${result.code}.png`
      link.href = dataUrl
      link.click()
      setStatus('已保存 ✓')
    } catch {
      setStatus('保存失败，可长按证书截图')
    } finally {
      onPrepareExport(false)
      window.setTimeout(() => setStatus(''), 2600)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText(result, serial))
      setStatus('文案已复制 ✓')
    } catch {
      setStatus('复制失败，可手动选择文字')
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
          保存图片
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="border-2 border-ink bg-paper px-3 py-2.5 font-display text-sm font-bold active:translate-y-px"
        >
          复制文案
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="border-2 border-ink bg-paper px-3 py-2.5 font-display text-sm font-bold active:translate-y-px"
        >
          重新鉴定
        </button>
      </div>
      <p className="mt-2 h-4 text-center font-mono text-xs text-ink/60" aria-live="polite">
        {status}
      </p>
    </div>
  )
}
