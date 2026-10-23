const STYLES = {
  literacy: 'bg-amber-100 text-amber-800',
  numeracy: 'bg-sky-100 text-sky-800',
  general: 'bg-slate-100 text-slate-700',
}

export default function FocusBadge({ area }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[area] ?? STYLES.general}`}>
      Focus: {area}
    </span>
  )
}
