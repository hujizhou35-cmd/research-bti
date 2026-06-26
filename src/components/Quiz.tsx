// 答题：一次一题，顶部进度，可返回上一题，最后一题答完自动出结果。
import { useState } from 'react'
import { questions } from '../lib/data'
import type { Answers, Choice } from '../lib/types'
import QuestionCard from './QuestionCard'

interface Props {
  answers: Answers
  startIndex?: number
  onAnswer: (id: number, choice: Choice) => void
  onComplete: () => void
  onExit: () => void
}

export default function Quiz({ answers, startIndex = 0, onAnswer, onComplete, onExit }: Props) {
  const total = questions.length
  const [index, setIndex] = useState(Math.min(startIndex, total - 1))
  const answeredCount = Object.keys(answers).length
  const current = questions[index]

  function handleSelect(choice: Choice) {
    onAnswer(current.id, choice)
    // 计入本次选择后的已答集合
    const willBeAnswered = { ...answers, [current.id]: choice }
    const remaining = questions.findIndex(
      (q) => willBeAnswered[q.id] !== 'A' && willBeAnswered[q.id] !== 'B',
    )
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
          进度 {answeredCount}/{total}
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
