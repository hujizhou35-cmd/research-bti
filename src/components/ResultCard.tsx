import { useLocale } from '../lib/LocaleContext'
import { localizeResult } from '../lib/locale'
// 鉴定证书主体（可截图区域）。3:4 竖屏，元素自上而下见 §7.5。
import { forwardRef } from 'react'
import type { Mode, ScoreResult } from '../lib/types'
import { vibeStyle } from '../lib/vibe'
import TypeAvatar from './TypeAvatar'
import RadarChart from './RadarChart'
import ProsConsList from './ProsConsList'
import MentorTips from './MentorTips'
import Barcode from './Barcode'
import Stamp from './Stamp'

interface Props {
  result: ScoreResult
  serial: string
  /** 版本：娱乐版 / 严谨版，用于证书徽章 */
  mode: Mode
  /** 导出 PNG 时：展开折叠区、关闭落章动画，保证截图完整 */
  exporting?: boolean
}

const ResultCard = forwardRef<HTMLDivElement, Props>(function ResultCard(
  { result, serial, mode, exporting = false },
  ref,
) {
  const { locale, t } = useLocale()
  const type = localizeResult(result.type, locale)
  const { poles, dimensions } = result
  const vibe = vibeStyle(type.vibe)
  const pickedSet = new Set(dimensions.map((d) => d.picked))
  const hasBorderline = dimensions.some((d) => d.borderline)
  const modeLabel = mode === 'fun' ? t('fun') : t('strict')

  return (
    <div
      ref={ref}
      data-testid="certificate"
      // 不要在被截图节点上用 mx-auto：html-to-image 会把解析后的 auto 外边距
      // 复制到克隆节点上，导致导出图整体右移并裁切。居中交给父级 flex。
      className="w-full max-w-[440px] border-[3px] border-ink bg-paper"
    >
      {/* ① 报告抬头：所名 + 流水号 + 条码 + 钢印 */}
      <header className="relative border-b-[3px] border-ink px-5 pb-3 pt-4">
        {/* 右侧留出钢印宽度，窄屏下标题不会被钢印盖住 */}
        <p className="pr-[100px] font-mono text-[10px] tracking-[0.2em] text-ink/60">
          {t('station')} · GRAD-BTI QC STATION
        </p>
        <h1 className="mt-1 pr-[88px] font-display text-xl font-black tracking-tight">
          {t('certificate')}
        </h1>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <Barcode value={result.code} height={30} />
            <p className="mt-1 font-mono text-[11px] font-medium tracking-wide text-ink/80">
              {serial}
            </p>
          </div>
        </div>
        {/* 钢印落章：盖在右上 */}
        <div className="absolute right-3 top-2">
          <Stamp code={result.code} size={104} animate={!exporting} />
        </div>
      </header>

      {/* ② 型号形象（亮点：大幅放大的证件照）+ 型号名 + tagline + vibe 徽章 */}
      <section className="px-5 pb-4 pt-5">
        <div className="relative mx-auto w-full max-w-[300px]">
          <TypeAvatar code={result.code} />
          {/* 证件照右下角的型号流水贴标，呼应检验单 */}
          <span className="absolute -bottom-2 right-1 border-2 border-ink bg-marker px-2 py-0.5 font-mono text-[11px] font-bold tracking-widest text-ink">
            {t('model')} {result.code}
          </span>
        </div>
        <div className="mt-5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className="border border-ink px-2 py-0.5 font-display text-[11px] font-bold"
              style={{ background: vibe.bg, color: vibe.fg }}
            >
              {t(result.type.vibe === '稀有' ? 'vibeRare' : result.type.vibe === '高危' ? 'vibeRisk' : result.type.vibe === '棘手' ? 'vibeTricky' : result.type.vibe === '少见' ? 'vibeUncommon' : 'vibeCommon')}
            </span>
            <span className="border border-ink bg-paper-2 px-2 py-0.5 font-display text-[11px] font-bold text-ink">
              {modeLabel}
            </span>
            <span className="font-mono text-[11px] tracking-wide text-ink/55">
              {result.code}
            </span>
          </div>
          <h2 className="mt-2 font-display text-[28px] font-black leading-tight">
            {type.name}
          </h2>
          <p className="mt-1 text-sm italic leading-snug text-ink/75">
            「{type.tagline}」
          </p>
        </div>
      </section>

      {/* ③ 型号扫描图（八向雷达图） */}
      <section className="border-t-2 border-grid px-5 py-3">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold tracking-wide text-ink/70">
            {t('scan')}
          </h3>
          {hasBorderline && (
            <span className="font-mono text-[10px] text-marker">{t('borderline')}</span>
          )}
        </div>
        <div className="mx-auto max-w-[300px]">
          <RadarChart poles={poles} picked={pickedSet} />
        </div>
      </section>

      {/* ④ {t('conclusion')} portrait */}
      <section className="border-t-2 border-grid px-5 py-3">
        <h3 className="mb-1.5 font-display text-sm font-bold tracking-wide">
          <span className="font-mono">▶</span> {t('conclusion')}
        </h3>
        <p className="border-l-4 border-ink bg-paper-2 px-3 py-2 text-sm leading-relaxed">
          {type.portrait}
        </p>
      </section>

      {/* ⑤ 优点 / 缺点 */}
      <section className="border-t-2 border-grid px-5 py-3">
        <ProsConsList pros={type.pros} cons={type.cons} />
      </section>

      {/* ⑥ 导师应对措施（折叠；导出时展开） */}
      <section className="border-t-2 border-grid px-5 py-3">
        <MentorTips strategy={type.mentorStrategy} tips={type.mentorTips} forceOpen={exporting} />
      </section>

      {/* ⑦ 底部免责 + 站点名 + 钢印 */}
      <footer className="flex items-end justify-between gap-3 border-t-[3px] border-ink px-5 py-3">
        <div className="text-[10px] leading-relaxed text-ink/55">
          <p>⚠ {t('privacyNote')}</p>
          <p className="mt-1">{t('disclaimer')}</p>
          <p className="mt-1 font-mono tracking-wide text-ink/45">
            gradbti · {t('station')}
          </p>
        </div>
        <div className="shrink-0 -rotate-6 border-2 border-stamp px-2 py-1 text-center">
          <p className="font-mono text-[9px] font-bold leading-none text-stamp">QC</p>
          <p className="font-mono text-[8px] font-bold leading-tight text-stamp">PASSED</p>
        </div>
      </footer>
    </div>
  )
})

export default ResultCard
