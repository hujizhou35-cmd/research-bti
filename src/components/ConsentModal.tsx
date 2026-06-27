// 知情同意「硬门槛」：未同意不能进入测试。同意后记录版本与时间。
import { useState } from 'react'

interface Props {
  onAgree: () => void
}

export default function ConsentModal({ onAgree }: Props) {
  const [declined, setDeclined] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/55 px-4 py-8">
      <div className="w-full max-w-lg border-2 border-ink bg-paper p-6 shadow-xl sm:p-7">
        <h1 className="font-display text-xl font-black tracking-tight">参与说明与知情同意</h1>
        <p className="mt-1 font-mono text-[11px] text-ink/55">请阅读后选择是否参与 · 版本 v1</p>

        <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink/85">
          <p>
            这是一个<strong>匿名</strong>的行为风格自评小测试。你的作答将被收集，
            <strong>用于统计调查与研究分析</strong>，以了解研究生群体在课题组情境中的行为倾向分布。
          </p>
          <p>
            <strong>我们会收集：</strong>你对各题的选择、系统据此生成的测评结果，以及你可能填写的少量背景信息。
            <strong>不会收集</strong>姓名、手机号、身份证号、学号等任何可直接识别你身份的信息。
          </p>
          <p>
            <strong>如何使用：</strong>数据仅用于整体统计与研究分析、只以汇总形式呈现，
            <strong>不</strong>作商业用途、<strong>不</strong>向第三方出售或提供。
          </p>
          <p>
            <strong>自愿与权利：</strong>参与完全自愿，你可随时关闭页面停止，不会有任何不利影响。
            本测试为娱乐性质的自我评估，结果<strong>不构成</strong>任何医学、心理或能力上的诊断与建议。
          </p>
          <p className="text-ink/60">
            如对本研究有疑问，可联系：<span className="font-mono">opusdog@163.com</span>。
          </p>
        </div>

        {declined && (
          <div className="mt-4 border-2 border-stamp bg-stamp/10 px-3 py-2 text-[13px] text-stamp">
            本测试需在你同意后才能开始。如不同意，请直接关闭本页面。
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onAgree}
            className="border-2 border-ink bg-stamp px-4 py-2.5 font-display text-sm font-bold text-white"
          >
            我已阅读并同意，开始
          </button>
          <button
            type="button"
            onClick={() => setDeclined(true)}
            className="border-2 border-ink bg-paper px-4 py-2.5 font-display text-sm font-bold"
          >
            不同意
          </button>
        </div>
      </div>
    </div>
  )
}
