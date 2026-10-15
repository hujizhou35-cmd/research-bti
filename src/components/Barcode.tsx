import { useLocale } from '../lib/LocaleContext'
// 一维条码（装饰性）：从 code 字符串确定性地生成竖条，承载型号 code 的「检验单数据感」。
interface Props {
  value: string
  height?: number
  className?: string
}

// 由字符确定性地推导条宽序列（1..4 像素单位），同一 code 永远同一条码。
function bars(value: string): number[] {
  const out: number[] = []
  const seed = `${value}::GB`
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i)
    out.push((c % 4) + 1) // bar
    out.push(((c >> 2) % 3) + 1) // gap
  }
  return out
}

export default function Barcode({ value, height = 34, className }: Props) {
  const { t } = useLocale()
  const seq = bars(value)
  const unit = 2
  const width = seq.reduce((a, w) => a + w * unit, 0)
  let x = 0
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={t('barcode') + ' ' + value}
    >
      {seq.map((w, i) => {
        const rectX = x
        x += w * unit
        // 偶数位画黑条，奇数位留白
        if (i % 2 !== 0) return null
        return <rect key={i} x={rectX} y={0} width={w * unit} height={height} fill="var(--ink)" />
      })}
    </svg>
  )
}
