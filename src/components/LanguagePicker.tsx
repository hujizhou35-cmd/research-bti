import { LANGUAGE_NAMES, LOCALES, type Locale } from '../lib/locale'

export default function LanguagePicker({ value, onChange, initial = false }: {
  value: Locale; onChange: (locale: Locale) => void; initial?: boolean
}) {
  return (
    <div className={initial ? 'mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10' : 'mb-4'}>
      <section className={initial ? 'border-2 border-ink bg-paper p-6 sm:p-8' : ''}>
        {initial && <><p className="font-mono text-xs tracking-widest text-ink/60">RESEARCH BTI · GRAD-BTI</p>
          <h1 className="my-5 font-display text-2xl font-black">Choose your language<br /><span className="text-lg">选择语言 · 言語を選択</span></h1></>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Language / 语言 / 言語">
          {LOCALES.map(lang => <button key={lang} lang={lang} type="button" aria-pressed={!initial && value === lang}
            onClick={() => onChange(lang)} className={`flex-1 border-2 border-ink px-3 py-2 text-sm font-bold ${!initial && value === lang ? 'bg-ink text-white' : 'bg-paper hover:bg-paper-2'}`}>
            {LANGUAGE_NAMES[lang]}</button>)}
        </div>
      </section>
    </div>
  )
}
