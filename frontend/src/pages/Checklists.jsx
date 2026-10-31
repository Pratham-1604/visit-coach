import { useState } from 'react'
import { getChecklistCsv, getChecklists, uploadChecklist } from '../api/checklists.js'
import { formatDate, itemText } from '../lib/format.js'
import { useLanguage, useT } from '../lib/i18n.js'
import { useFetch } from '../lib/useFetch.js'

const CSV_COLUMNS = 'id, subject, need_area, text_en, text_mr, text_hi, look_for, kpalp'

// The state admin's page: the checklist every mentor in the state uses, its versions, and uploading a new one.
export default function Checklists() {
  const t = useT()
  const [reload, setReload] = useState(0)
  const { data, error, loading } = useFetch(() => getChecklists(), [reload])

  if (loading && !data) return <p className="text-slate-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-600">{t('observe.error', { error })}</p>

  const { active } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('checklist.title')}</h1>
        <p className="text-slate-700">{active.name}</p>
        <p className="text-sm text-slate-500">
          {t('checklist.version', { state: active.state_name, version: active.version, n: active.items.length })}
        </p>
        <p className="text-sm text-slate-500">
          {t('checklist.by', { who: active.uploaded_by, date: formatDate(active.created_at) })}
        </p>
        {active.note && <p className="mt-1 text-sm italic text-slate-600">“{active.note}”</p>}
      </div>

      <Items checklist={active} />
      <Upload onUploaded={() => setReload((n) => n + 1)} />
      <Versions versions={data.versions} activeId={active.id} />
    </div>
  )
}

function Items({ checklist }) {
  const t = useT()
  const language = useLanguage()

  async function download() {
    const blob = await getChecklistCsv(checklist.id)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `checklist-${checklist.state}-v${checklist.version}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const areas = checklist.need_areas
    .map((area) => ({ area, items: checklist.items.filter((item) => item.need_area === area.id) }))
    .filter((group) => group.items.length)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{t('checklist.items')}</h2>
        <button onClick={download} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium">
          ⬇ {t('checklist.download')}
        </button>
      </div>
      <p className="text-xs text-slate-500">{t('checklist.download_hint')}</p>
      {areas.map(({ area, items }) => (
        <div key={area.id} className="rounded-xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t(`need.${area.id}`)}
          </p>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-2 text-sm">
                <p className="font-medium">{itemText(item, language)}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{item.id}</span> · {t(`subject.${item.subject}`)}
                  {item.kpalp && ` · KPALP ${item.kpalp}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function Upload({ onUploaded }) {
  const t = useT()
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [working, setWorking] = useState(false)
  const [problems, setProblems] = useState([])
  const [done, setDone] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setWorking(true)
    setProblems([])
    setDone(null)
    try {
      const checklist = await uploadChecklist(file, name, note)
      setDone(checklist.version)
      setFile(null)
      setName('')
      setNote('')
      event.target.reset()
      onUploaded()
    } catch (err) {
      setProblems(uploadProblems(err.message))
    }
    setWorking(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h2 className="font-medium">{t('checklist.upload_title')}</h2>
      <p className="text-xs text-slate-500">{t('checklist.upload_hint', { columns: CSV_COLUMNS })}</p>
      <label className="block space-y-1">
        <span className="font-medium">{t('checklist.file')}</span>
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          required
          onChange={(event) => setFile(event.target.files[0] ?? null)}
          className="block w-full text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="font-medium">{t('checklist.name')}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white p-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="font-medium">{t('checklist.note')}</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white p-2"
        />
      </label>
      {problems.length > 0 && (
        <div className="rounded-lg bg-rose-50 p-3 text-rose-800">
          <p className="font-medium">{t('checklist.problems')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {problems.map((problem, index) => (
              <li key={index}>{problem}</li>
            ))}
          </ul>
        </div>
      )}
      {done && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-900">{t('checklist.uploaded', { version: done })}</p>}
      <button
        disabled={!file || working}
        className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {working ? t('checklist.uploading') : t('checklist.upload')}
      </button>
    </form>
  )
}

function Versions({ versions, activeId }) {
  const t = useT()
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{t('checklist.history')}</h2>
      <ol className="space-y-2">
        {versions.map((version) => (
          <li key={version.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium">
              {t('checklist.history_row', {
                version: version.version,
                n: version.items_count,
                date: formatDate(version.created_at),
              })}
              {version.id === activeId && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                  {t('checklist.in_use')}
                </span>
              )}
            </p>
            <p className="text-slate-600">{version.name}</p>
            <p className="text-xs text-slate-500">
              {version.uploaded_by}
              {version.note && ` · ${version.note}`}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

// The server answers a bad file with 422 and {"detail": {"problems": [...]}}; show each problem.
function uploadProblems(message) {
  try {
    return JSON.parse(message.replace(/^\d+: /, '')).detail.problems ?? [message]
  } catch {
    return [message]
  }
}
