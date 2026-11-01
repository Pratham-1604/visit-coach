import { useT } from '../lib/i18n.js'

const STYLES = {
  literacy: 'bg-amber-100 text-amber-800',
  numeracy: 'bg-sky-100 text-sky-800',
  general: 'bg-slate-100 text-slate-700',
}

export default function FocusBadge({ area }) {
  const t = useT()
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[area] ?? STYLES.general}`}>
      {t(`focus.${STYLES[area] ? area : 'general'}`)}
    </span>
  )
}
