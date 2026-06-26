// 单题卡片：题干 + A/B 两个选项。文案照 questions.json 原文，不改题意。
import type { Question, Choice } from '../lib/types'

interface Props {
  question: Question
  index: number
  total: number
  selected?: Choice
  onSelect: (choice: Choice) => void
}

export default function QuestionCard({ question, index, total, selected, onSelect }: Props) {
  const options: { key: Choice; text: string }[] = [
    { key: 'A', text: question.optionA },
    { key: 'B', text: question.optionB },
  ]

  return (
    <div key={question.id} className="animate-fade-in">
      {/* 题号字段 */}
      <div className="mb-3 flex items-center gap-2 font-mono text-xs text-ink/55">
        <span className="border border-ink px-1.5 py-0.5 font-bold text-ink">
          ITEM {String(index + 1).padStart(2, '0')}/{total}
        </span>
        <span>维度 {question.dimension}</span>
      </div>

      <h2 className="font-display text-xl font-bold leading-snug">{question.text}</h2>

      <div className="mt-5 space-y-3">
        {options.map((opt) => {
          const active = selected === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelect(opt.key)}
              aria-pressed={active}
              className={`flex w-full items-start gap-3 border-2 px-4 py-3 text-left transition-colors active:translate-y-px ${
                active
                  ? 'border-ink bg-stamp text-white'
                  : 'border-ink bg-paper hover:bg-paper-2'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-2 font-mono text-sm font-bold ${
                  active ? 'border-white text-white' : 'border-ink text-ink'
                }`}
              >
                {opt.key}
              </span>
              <span className="text-[15px] leading-snug">{opt.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
