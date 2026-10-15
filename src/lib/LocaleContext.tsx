import { createContext, useContext, type ReactNode } from 'react'
import { message, type Locale, type MessageKey } from './locale'

const Context = createContext<Locale>('en')
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Context.Provider value={locale}>{children}</Context.Provider>
}
export function useLocale() {
  const locale = useContext(Context)
  return { locale, t: (key: MessageKey) => message(locale, key) }
}
