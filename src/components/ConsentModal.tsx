import { useEffect, useRef } from 'react'
import { useLocale } from '../lib/LocaleContext'
export function ParticipationInfo() {
  const { t } = useLocale()
  return <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink/85">
    {(['consentIntro','consentData','consentUse','consentService','consentRights','consentDisclaimer'] as const).map(key => <p key={key}>{t(key)}</p>)}
    <p>{t('contact')}: <a className="underline" href="mailto:opusdog@163.com">opusdog@163.com</a></p>
    <p className="text-xs"><a className="underline" href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare</a> · <a className="underline" href="https://www.geetest.com/en/legal/privacy-policy/captcha-v4" target="_blank" rel="noopener noreferrer">GeeTest</a></p>
  </div>
}
export default function ConsentModal({ onAgree, onCancel, privacyOnly = false }: { onAgree?: () => void; onCancel: () => void; privacyOnly?: boolean }) {
  const { t } = useLocale()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
      if (event.key !== 'Tab') return
      const nodes = panel.current?.querySelectorAll<HTMLElement>('button, a[href]')
      if (!nodes?.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [onCancel])
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/55 px-4 py-8">
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="consent-title" className="my-auto w-full max-w-lg border-2 border-ink bg-paper p-6 shadow-xl sm:p-7">
      <h1 id="consent-title" className="font-display text-xl font-black tracking-tight">{t(privacyOnly ? 'privacy' : 'consentTitle')}</h1>
      {!privacyOnly && <p className="mt-1 font-mono text-[11px] text-ink/55">{t('consentHint')} · v2</p>}
      <ParticipationInfo />
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        {!privacyOnly && <button type="button" onClick={onAgree} className="border-2 border-ink bg-stamp px-4 py-2.5 font-display text-sm font-bold text-white">{t('agree')}</button>}
        <button type="button" onClick={onCancel} className="border-2 border-ink bg-paper px-4 py-2.5 font-display text-sm font-bold">{t(privacyOnly ? 'close' : 'decline')}</button>
      </div>
    </div>
  </div>
}
