// 单题卡片：题干 + 5 个极性五级选项。文案照 questionsv5.json 原文，不改题意。
// 选项整组方向翻转随机化（block-reverse）：flip=true 时整组逆序呈现（第二极→第一极），
// 但**不打乱相对顺序**（序数量表不可乱序）。无论如何呈现，记录的是所选选项的 value。
import { useMemo } from 'react'
import type { Question, OptionValue } from '../lib/types'

interface Props {
  question: Question
  index: number
  total: number
  /** 是否整组逆序呈现 */
  flip: boolean
  selected?: OptionValue
  onSelect: (value: OptionValue) => void
}

// 屏幕序号标签，仅作视觉占位，与计分无关。
const MARKERS = ['A', 'B', 'C', 'D', 'E']

export default function QuestionCard({
  question,
  index,
  total,
  flip,
  selected,
  onSelect,
}: Props) {
  // questionsv5.json 中 options 恒按 value 4→0（第一极→第二极）排列；
  // flip 时整组逆序为 0→4（第二极→第一极）。仅改变呈现顺序，value 不变。
  const options = useMemo(() => {
    const arr = question.options
    return flip ? [...arr].slice().reverse() : arr
  }, [question.options, flip])

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

      <div className="mt-5 space-y-2.5">
        {options.map((opt, i) => {
          const active = selected === opt.value
          const marker = MARKERS[i] ?? String(i + 1)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
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
                {marker}
              </span>
              <span className="text-[15px] leading-snug">{opt.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
