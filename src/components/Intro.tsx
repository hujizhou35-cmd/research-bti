// 门面页：所名、slogan、免责声明、开始按钮。
import { disclaimer, privacyNote, questions } from '../lib/data'

interface Props {
  onStart: () => void
  hasSaved: boolean
  onResume: () => void
}

export default function Intro({ onStart, hasSaved, onResume }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10">
      <div className="animate-fade-in border-2 border-ink bg-paper p-6 sm:p-8">
        {/* 报告抬头 */}
        <div className="mb-6 flex items-start justify-between border-b-2 border-ink pb-3">
          <div>
            <p className="font-mono text-xs tracking-widest text-ink/60">研究生BTI · GRAD-BTI</p>
            <h1 className="mt-1 font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              课题组牛马
              <br />
              人格鉴定所
            </h1>
          </div>
          <div className="shrink-0 -rotate-6 border-2 border-stamp px-2 py-1 text-center">
            <p className="font-mono text-[10px] font-bold leading-none text-stamp">QC</p>
            <p className="font-mono text-[10px] font-bold leading-tight text-stamp">质检站</p>
          </div>
        </div>

        <p className="font-display text-lg font-bold leading-snug">
          40 道题，照出你在课题组的原形。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          一套 MBTI 式的科研人格趣味自评：答完 {questions.length} 道情境题，
          你会被盖章鉴定为 16 种「科研牛马型号」之一，并领到一张可截图的
          《科研牛马人格鉴定证书》。
        </p>

        {/* 检验单字段感的元信息 */}
        <dl className="mt-5 grid grid-cols-3 gap-px border-2 border-ink bg-ink text-center font-mono text-xs">
          {[
            ['题量', `${questions.length} 题`],
            ['耗时', '约 5 分钟'],
            ['型号库', '16 种'],
          ].map(([k, v]) => (
            <div key={k} className="bg-paper px-2 py-2">
              <dt className="text-ink/55">{k}</dt>
              <dd className="mt-0.5 text-sm font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onStart}
            className="w-full border-2 border-ink bg-stamp px-4 py-3 font-display text-base font-bold tracking-wide text-white transition-transform active:translate-y-px"
          >
            开始鉴定 →
          </button>
          {hasSaved && (
            <button
              type="button"
              onClick={onResume}
              className="w-full border-2 border-ink bg-paper px-4 py-2.5 font-display text-sm font-bold tracking-wide transition-transform active:translate-y-px"
            >
              继续上次未答完的鉴定
            </button>
          )}
        </div>

        {/* 免责声明 */}
        <div className="mt-6 border-t border-grid pt-3 text-[11px] leading-relaxed text-ink/55">
          <p>⚠ {privacyNote}</p>
          <p className="mt-1">{disclaimer}</p>
        </div>
      </div>
    </div>
  )
}
