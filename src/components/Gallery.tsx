import { resultTypes } from '../lib/data'
import { useLocale } from '../lib/LocaleContext'
import { localizeResult, urlFor, type Locale } from '../lib/locale'
import TypeAvatar from './TypeAvatar'
import ProsConsList from './ProsConsList'
import MentorTips from './MentorTips'
import LanguagePicker from './LanguagePicker'

export default function Gallery({ onLanguage }: { onLanguage: (locale: Locale) => void }) {
  const { locale, t } = useLocale()
  return <div className="min-h-screen bg-ink"><div className="mx-auto max-w-[1280px] px-5 py-9">
    <header className="mb-6"><a href={urlFor(locale)} className="text-sm text-paper underline">← {t('backHome')}</a><h1 className="my-4 font-display text-3xl font-black text-paper">{t('galleryTitle')}</h1><p className="mb-4 text-sm text-marker">{t('galleryNote')}</p><LanguagePicker value={locale} onChange={onLanguage} /></header>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{resultTypes.map(raw => {
      const type = localizeResult(raw, locale)
      return <article key={type.code} className="border-2 border-ink bg-paper p-5 sm:p-6">
        <div className="mx-auto max-w-[248px]"><TypeAvatar code={type.code} /></div>
        <p className="mt-4 font-mono text-sm tracking-widest">{type.code}</p><h2 className="font-display text-2xl font-black">{type.name}</h2><p className="my-2 text-sm italic text-ink/70">{type.tagline}</p><p className="my-4 border-l-4 border-stamp bg-paper-2 p-3 text-sm leading-relaxed">{type.portrait}</p>
        <ProsConsList pros={type.pros} cons={type.cons} /><div className="mt-4"><MentorTips strategy={type.mentorStrategy} tips={type.mentorTips} forceOpen /></div>
      </article>
    })}</div><footer className="mt-8 text-center text-xs leading-relaxed text-paper/70">{t('disclaimer')}</footer>
  </div></div>
}
