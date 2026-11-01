import { LANGUAGES, setLanguage, useLanguage, useT } from '../lib/i18n.js'
import { setTheme, useTheme } from '../lib/theme.js'

// Language and light/dark switches: in the top-bar menu, and on the login screen.
export default function Settings() {
  const t = useT()
  const language = useLanguage()
  const theme = useTheme()

  return (
    <div className="space-y-3">
      <Choice
        label={t('menu.language')}
        options={LANGUAGES}
        value={language}
        onChange={setLanguage}
      />
      <Choice
        label={t('menu.theme')}
        options={[
          { id: 'light', label: `☀️ ${t('menu.light')}` },
          { id: 'dark', label: `🌙 ${t('menu.dark')}` },
        ]}
        value={theme}
        onChange={setTheme}
      />
    </div>
  )
}

function Choice({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium ${
              value === option.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
