// §7.4 签名元素：钢印落章。出结果时一枚正红检验钢印盖到证书上。
// 章面 = 4 字母 code + 「QC PASSED / 牛马型号」。
interface Props {
  code: string
  size?: number
  /** 是否播放落章动画 */
  animate?: boolean
  className?: string
}

export default function Stamp({ code, size = 116, animate = true, className }: Props) {
  const r = size / 2
  const arcR = r - 16
  return (
    <div
      className={`${animate ? 'motion-safe:animate-stamp-drop' : ''} ${className ?? ''}`}
      style={{ width: size, height: size, transform: 'rotate(-13deg)' }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <path
            id={`arc-top-${code}`}
            d={`M ${r - arcR} ${r} A ${arcR} ${arcR} 0 0 1 ${r + arcR} ${r}`}
            fill="none"
          />
          <path
            id={`arc-bottom-${code}`}
            d={`M ${r - arcR} ${r} A ${arcR} ${arcR} 0 0 0 ${r + arcR} ${r}`}
            fill="none"
          />
        </defs>
        <g stroke="var(--stamp)" fill="var(--stamp)">
          <circle cx={r} cy={r} r={r - 4} fill="none" strokeWidth={4.5} />
          <circle cx={r} cy={r} r={r - 13} fill="none" strokeWidth={2} strokeDasharray="3 5" />
          {/* 上弧：QC PASSED */}
          <text fontFamily='"DM Mono","Courier New",monospace' fontSize={size * 0.115} fontWeight={500} letterSpacing="2">
            <textPath href={`#arc-top-${code}`} startOffset="50%" textAnchor="middle">
              QC · PASSED · 检验合格
            </textPath>
          </text>
          {/* 下弧：牛马型号 */}
          <text fontFamily='"Noto Sans SC",sans-serif' fontSize={size * 0.1} fontWeight={700} letterSpacing="3">
            <textPath href={`#arc-bottom-${code}`} startOffset="50%" textAnchor="middle">
              牛 马 型 号
            </textPath>
          </text>
          {/* 中央五角星 + code */}
          <text
            x={r}
            y={r - size * 0.085}
            textAnchor="middle"
            fontSize={size * 0.17}
            stroke="none"
          >
            ★
          </text>
          <text
            x={r}
            y={r + size * 0.13}
            textAnchor="middle"
            fontFamily='"DM Mono","Courier New",monospace'
            fontSize={size * 0.2}
            fontWeight={500}
            letterSpacing="2"
            stroke="none"
          >
            {code}
          </text>
        </g>
      </svg>
    </div>
  )
}
