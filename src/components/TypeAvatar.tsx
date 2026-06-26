// 加载 public/avatars/<code>.svg 的型号形象。
// 用「内联 SVG」而非 <img>：内联后 SVG 内的 font-family="Noto Sans SC"/"DM Mono"
// 才能用上页面 @font-face 字体，且 html-to-image 导出 PNG 时不掉字。
import { useEffect, useState } from 'react'

interface Props {
  code: string
  className?: string
}

// 同一型号的 SVG 文本缓存，避免重复请求
const cache = new Map<string, string>()

export default function TypeAvatar({ code, className }: Props) {
  const [svg, setSvg] = useState<string | null>(cache.get(code) ?? null)

  useEffect(() => {
    let alive = true
    if (cache.has(code)) {
      setSvg(cache.get(code)!)
      return
    }
    const url = `${import.meta.env.BASE_URL}avatars/${code}.svg`
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`avatar ${code} 加载失败`))))
      .then((text) => {
        cache.set(code, text)
        if (alive) setSvg(text)
      })
      .catch(() => {
        if (alive) setSvg(null)
      })
    return () => {
      alive = false
    }
  }, [code])

  return (
    <div
      className={`aspect-square w-full overflow-hidden border-2 border-ink bg-paper-2 ${className ?? ''}`}
      aria-label={`型号 ${code} 形象图`}
      role="img"
    >
      {svg ? (
        <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-sm text-grid">
          {code}
        </div>
      )}
    </div>
  )
}
