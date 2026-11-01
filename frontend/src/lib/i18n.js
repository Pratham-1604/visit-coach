import { createSetting } from './settings.js'
import { STRINGS } from './strings.js'

// The language of the mentor's screens. Packets stay in the teacher's language whatever is picked here.
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'mr', label: 'मराठी' },
  { id: 'hi', label: 'हिंदी' },
]

const language = createSetting('visitcoach.language', () => 'en')

export const useLanguage = language.use

export function setLanguage(id) {
  language.set(id)
  applyLanguage()
}

// Sets <html lang>, so the phone uses the right font and reads the page out correctly.
export function applyLanguage() {
  document.documentElement.lang = language.get()
}

// t('school.agreed', { name: 'Sunita' }): the text in the chosen language, falling back to English.
export function useT() {
  const current = useLanguage()
  return (key, values) => translate(current, key, values)
}

export function translate(lang, key, values = {}) {
  const text = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in values ? values[name] : match))
}

// '1 visit' / '3 visits': picks key.one or key.many.
export function plural(t, key, n) {
  return t(n === 1 ? `${key}.one` : `${key}.many`, { n })
}
