// 结尾认真度自评（防污染信号，不计分、不影响结果）。
// 答完所有题后、出证书前出现，仅用于数据质量筛查。
import type { SelfReport } from '../lib/collect'

interface Props {
  onSelect: (sr: SelfReport) => void
}

const OPTIONS: { value: SelfReport; label: string }[] = [
  { value: 'serious', label: '认真完成的' },
  { value: 'partial', label: '大致认真，个别题随便选了' },
  { value: 'careless', label: '基本是随便选的' },
]

export default function EffortCheck({ onSelect }: Props) {
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
              onClick={() => onSelect(o.value)}
              className="flex w-full items-center border-2 border-ink bg-paper px-4 py-3 text-left text-[15px] font-bold transition-colors hover:bg-stamp hover:text-white"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
