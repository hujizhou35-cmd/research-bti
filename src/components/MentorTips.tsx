// 导师应对措施（可折叠）。标题中性写「带教 / 协作建议」，措辞不针对个人。
import { useState } from 'react'

interface Props {
  strategy: string
  tips: string[]
  /** 导出 PNG 时强制展开 */
  forceOpen?: boolean
}

export default function MentorTips({ strategy, tips, forceOpen = false }: Props) {
  const [open, setOpen] = useState(false)
  const expanded = forceOpen || open

  return (
    <section className="border-2 border-ink bg-paper">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 bg-paper-2 px-3 py-2 text-left"
      >
        <span className="font-display text-sm font-bold tracking-wide">
          <span className="font-mono">§</span> 带教 / 协作建议
        </span>
        <span className="font-mono text-xs text-ink/60">
          {expanded ? '[ − 收起 ]' : '[ + 展开 ]'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 p-3">
          <p className="border-l-4 border-marker bg-paper-2 px-3 py-2 text-sm leading-snug">
            <span className="font-mono text-xs font-bold tracking-wide text-ink/60">策略 · </span>
            {strategy}
          </p>
          <ul className="space-y-1.5">
            {tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug">
                <span className="mt-0.5 font-mono text-xs text-ink/50">{String(i + 1).padStart(2, '0')}</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
