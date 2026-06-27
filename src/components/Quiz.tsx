// 答题：一次一题，顶部进度，可返回上一题，最后一题答完自动出结果。
// 题集由父级按版本（娱乐/严谨）传入；进度条按题集总数计算。
import { useState } from 'react'
import type { Answers, Mode, OptionValue, Question } from '../lib/types'
import QuestionCard from './QuestionCard'

interface Props {
  items: Question[]
  mode: Mode
  answers: Answers
  /** 每题是否整组翻转呈现（block-reverse），由父级生成并持久化，用于方法学核查 */
  flips: Record<number, boolean>
  startIndex?: number
  onAnswer: (id: number, value: OptionValue) => void
  onComplete: () => void
  onExit: () => void
}

function isAnswered(v: OptionValue | undefined): boolean {
  return v === 0 || v === 1 || v === 2 || v === 3 || v === 4
}

export default function Quiz({
  items,
  mode,
  answers,
  flips,
  startIndex = 0,
  onAnswer,
  onComplete,
  onExit,
}: Props) {
  const total = items.length
  const [index, setIndex] = useState(Math.min(startIndex, total - 1))
  const answeredCount = items.filter((q) => isAnswered(answers[q.id])).length
  const current = items[index]

  function handleSelect(value: OptionValue) {
    onAnswer(current.id, value)
    const willBeAnswered: Answers = { ...answers, [current.id]: value }
    const remaining = items.findIndex((q) => !isAnswered(willBeAnswered[q.id]))
    window.setTimeout(() => {
      if (remaining === -1) {
        onComplete()
      } else if (index < total - 1) {
        setIndex((i) => Math.min(i + 1, total - 1))
      } else {
        setIndex(remaining) // 最后一题但仍有遗漏：跳到第一处未答
      }
    }, 160)
  }

  const progress = Math.round((answeredCount / total) * 100)
  const modeLabel = mode === 'fun' ? '娱乐版' : '严谨版'

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-6">
      {/* 顶部：返回 + 进度 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="font-mono text-xs text-ink/60 hover:text-ink"
        >
          ← 退出
        </button>
        <span className="font-mono text-xs font-bold tracking-wide">
          {modeLabel} · 进度 {answeredCount}/{total}
        </span>
      </div>

      {/* 进度条 */}
      <div className="mb-6 h-3 w-full border-2 border-ink bg-paper">
        <div
          className="h-full bg-ink transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-1 items-center">
        <div className="w-full border-2 border-ink bg-paper p-5 sm:p-6">
          <QuestionCard
            question={current}
            index={index}
            total={total}
            flip={flips[current.id] ?? false}
            selected={answers[current.id]}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* 底部导航 */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-bold disabled:opacity-35"
        >
          ← 上一题
        </button>

        {answeredCount === total ? (
          <button
            type="button"
            onClick={onComplete}
            className="border-2 border-ink bg-stamp px-4 py-2 font-display text-sm font-bold text-white"
          >
            出具鉴定证书 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index === total - 1}
            className="border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-bold disabled:opacity-35"
          >
            下一题 →
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-ink/45">
        请按真实第一反应作答 · 未答完无法出证书
      </p>
    </div>
  )
}
