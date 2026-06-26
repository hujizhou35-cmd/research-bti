// 优点 / 缺点两栏。优点偏正色，缺点偏钢印红（§7.5）。
interface Props {
  pros: string[]
  cons: string[]
}

export default function ProsConsList({ pros, cons }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <section className="border-2 border-ink bg-paper">
        <h3 className="border-b-2 border-ink bg-paper-2 px-3 py-1.5 font-display text-sm font-bold tracking-wide">
          <span className="font-mono">[+]</span> 出厂优点
        </h3>
        <ul className="space-y-2 p-3">
          {pros.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span className="mt-0.5 font-mono font-bold text-[#2f7d4f]">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-2 border-ink bg-paper">
        <h3 className="border-b-2 border-ink bg-paper-2 px-3 py-1.5 font-display text-sm font-bold tracking-wide">
          <span className="font-mono text-stamp">[!]</span> 已知缺陷
        </h3>
        <ul className="space-y-2 p-3">
          {cons.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span className="mt-0.5 font-mono font-bold text-stamp">✗</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
