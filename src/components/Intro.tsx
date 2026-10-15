import { questions, funQuestions } from '../lib/data'
import { useLocale } from '../lib/LocaleContext'
import { LANGUAGE_NAMES, urlFor, type Locale } from '../lib/locale'
import type { Mode } from '../lib/types'
import LanguagePicker from './LanguagePicker'
interface Props {
  onStart: (mode: Mode) => void; hasSaved: boolean; savedMode?: Mode; savedLocale?: Locale
  savedAnswered?: number; savedTotal?: number; onResume: () => void; onLanguage: (locale: Locale) => void
}
export default function Intro({ onStart, hasSaved, savedMode, savedLocale, savedAnswered, savedTotal, onResume, onLanguage }: Props) {
  const { locale, t } = useLocale()
  return <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10">
    <LanguagePicker value={locale} onChange={onLanguage} />
    <div className="animate-fade-in border-2 border-ink bg-paper p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-3 border-b-2 border-ink pb-3">
        <div className="min-w-0"><p className="font-mono text-xs tracking-widest text-ink/60">{t('brand')}</p>
          <h1 className="mt-1 whitespace-pre-line font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl">{t('introTitle')}</h1></div>
        <div className="shrink-0 -rotate-6 border-2 border-stamp px-2 py-1 text-center"><p className="font-mono text-[10px] font-bold leading-none text-stamp">QC</p><p className="font-mono text-[10px] font-bold leading-tight text-stamp">{t('qc')}</p></div>
      </div>
      <p className="font-display text-lg font-bold leading-snug">{t('slogan')}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{t('intro')}</p>
      <dl className="mt-5 grid grid-cols-3 gap-px border-2 border-ink bg-ink text-center font-mono text-xs">
        {[[t('items'), `${funQuestions.length} / ${questions.length} ${t('itemUnit')}`], [t('time'), t('timeEstimate')], [t('types'), t('typeCount')]].map(([k, v]) => <div key={k} className="bg-paper px-2 py-2"><dt className="text-ink/55">{k}</dt><dd className="mt-0.5 text-sm font-bold text-ink">{v}</dd></div>)}
      </dl>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={() => onStart('fun')} className="w-full border-2 border-ink bg-stamp px-4 py-3 text-left text-white transition-transform active:translate-y-px"><span className="font-display text-base font-bold tracking-wide">🎢 {t('fun')} · {funQuestions.length} {t('itemUnit')}</span><span className="mt-0.5 block font-mono text-[11px] text-white/85">{t('funDetail')}</span></button>
        <button type="button" onClick={() => onStart('strict')} className="w-full border-2 border-ink bg-paper px-4 py-3 text-left transition-transform active:translate-y-px hover:bg-paper-2"><span className="font-display text-base font-bold tracking-wide">🔬 {t('strict')} · {questions.length} {t('itemUnit')}</span><span className="mt-0.5 block font-mono text-[11px] text-ink/65">{t('strictDetail')}</span></button>
        {hasSaved && <><button type="button" onClick={onResume} className="w-full border-2 border-dashed border-ink bg-paper px-4 py-2.5 font-display text-sm font-bold tracking-wide">{t('resume')} ({savedMode === 'fun' ? t('fun') : t('strict')} {savedAnswered}/{savedTotal} · {LANGUAGE_NAMES[savedLocale ?? 'zh-CN']})</button><p className="text-xs leading-relaxed text-ink/60">{t('languageRestart')}</p></>}
        <a href={urlFor(locale, true)} target="_blank" rel="noopener noreferrer" className="w-full border-2 border-ink bg-paper px-4 py-2.5 text-center font-display text-sm font-bold tracking-wide transition-transform active:translate-y-px hover:bg-paper-2">📖 {t('gallery')}</a>
      </div>
      <div className="mt-6 border-t border-grid pt-3 text-[11px] leading-relaxed text-ink/55"><p>⚠ {t('privacyNote')}</p><p className="mt-1">{t('disclaimer')}</p></div>
    </div>
  </div>
}
