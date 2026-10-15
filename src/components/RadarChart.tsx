import { useLocale } from '../lib/LocaleContext'
// §7.8 型号扫描图：八向极坐标雷达图（octagon）。
// 轴序固定 C → O → P → T → X → A → R → W（让同维两极在圆上正对）。
// 每轴半径 = 该极的原始计数 poles[letter]（0..10）。画原始计数而非折叠强度，
// 保证 0/10、5/5、10/0 三种输入画出三种明显不同的形状。
import { useMemo } from 'react'
import type { Poles, PoleLetter } from '../lib/types'

const ORDER: PoleLetter[] = ['C', 'O', 'P', 'T', 'X', 'A', 'R', 'W']
const MAX = 10
const RINGS = [2, 4, 6, 8, 10]

// 极字母 -> 极名（中文），取自 dimensions.json（polarity-graded-5 结构）


interface Props {
  poles: Poles
  /** 命中的极（加粗其轴标签字母） */
  picked: Set<PoleLetter>
  size?: number
}

function point(cx: number, cy: number, radius: number, i: number) {
  // i=0 在正上方，顺时针每 45°
  const angle = (-90 + i * 45) * (Math.PI / 180)
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

/**
 * 纯函数：计算数据多边形的 8 个顶点坐标（用于目测与判别性单测）。
 * 因为半径取原始计数，0/5/10 三种输入会得到三组明显不同的顶点。
 */
export function radarVertices(
  poles: Poles,
  R: number,
  cx = 0,
  cy = 0,
): { letter: PoleLetter; x: number; y: number; value: number }[] {
  return ORDER.map((letter, i) => {
    const value = poles[letter] ?? 0
    const r = (value / MAX) * R
    const p = point(cx, cy, r, i)
    return { letter, x: p.x, y: p.y, value }
  })
}

function octagonPath(cx: number, cy: number, radius: number) {
  return (
    ORDER.map((_, i) => {
      const p = point(cx, cy, radius, i)
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
    }).join(' ') + ' Z'
  )
}

export default function RadarChart({ poles, picked, size = 340 }: Props) {
  const { locale, t } = useLocale()
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.265 // 数据半径，刻意收小，给外圈中文极名留足边距，避免标签被裁切

  const dataPath = useMemo(() => {
    return (
      ORDER.map((letter, i) => {
        const v = poles[letter] ?? 0
        const r = (v / MAX) * R
        const p = point(cx, cy, r, i)
        return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
      }).join(' ') + ' Z'
    )
  }, [poles, cx, cy, R])

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      role="img"
      aria-label={t('radarAlt')}
      className="block"
    >
      {/* 同心八边形网格 0/2/4/6/8/10 */}
      {RINGS.map((ring) => (
        <path
          key={ring}
          d={octagonPath(cx, cy, (ring / MAX) * R)}
          fill="none"
          stroke="var(--grid)"
          strokeWidth={ring === MAX ? 1.4 : 0.8}
        />
      ))}

      {/* 轴线 + 外圈标签 */}
      {ORDER.map((letter, i) => {
        const end = point(cx, cy, R, i)
        const labelPos = point(cx, cy, R + size * 0.085, i)
        const isPicked = picked.has(letter)
        return (
          <g key={letter}>
            <line
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="var(--grid)"
              strokeWidth={0.8}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * (locale === 'en' ? 0.036 : 0.05)}
              fill="var(--ink)"
            >
              <tspan
                fontFamily='"DM Mono","Courier New",monospace'
                fontWeight={isPicked ? 700 : 400}
                fill={isPicked ? 'var(--stamp)' : 'var(--ink)'}
              >
                {letter}
              </tspan>
              <tspan
                fontFamily={locale === 'ja' ? '"Noto Sans JP",sans-serif' : '"Noto Sans SC",sans-serif'}
                fontWeight={isPicked ? 700 : 400}
                dx={size * 0.012}
              >
                {t(('pole' + letter) as 'poleC')}
              </tspan>
            </text>
          </g>
        )
      })}

      {/* 等宽小字刻度（沿正上方轴标 2/4/6/8/10） */}
      {RINGS.map((ring) => {
        const p = point(cx, cy, (ring / MAX) * R, 0)
        return (
          <text
            key={`tick-${ring}`}
            x={p.x + size * 0.018}
            y={p.y}
            fontSize={size * 0.032}
            fontFamily='"DM Mono","Courier New",monospace'
            fill="var(--grid)"
            dominantBaseline="middle"
          >
            {ring}
          </text>
        )
      })}

      {/* 数据多边形（从中心扫描展开一次；reduced-motion 下直接定格） */}
      <g
        className="origin-center motion-safe:animate-scan-expand"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <path
          d={dataPath}
          fill="var(--stamp)"
          fillOpacity={0.22}
          stroke="var(--ink)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* 顶点描点 */}
        {ORDER.map((letter, i) => {
          const v = poles[letter] ?? 0
          const r = (v / MAX) * R
          const p = point(cx, cy, r, i)
          return (
            <circle
              key={`dot-${letter}`}
              cx={p.x}
              cy={p.y}
              r={2.2}
              fill="var(--ink)"
            />
          )
        })}
      </g>
    </svg>
  )
}
