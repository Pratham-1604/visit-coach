import { Link, useRouteError } from 'react-router-dom'
import { useT } from '../lib/i18n.js'

// Shown for unknown links and for crashes on a page, instead of React Router's default error screen.
export default function NotFound() {
  const t = useT()
  const error = useRouteError()
  const notFound = !error || error.status === 404

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 text-center text-slate-900">
      <h1 className="text-xl font-semibold">{notFound ? t('notfound.title') : t('notfound.crash')}</h1>
      <p className="mt-2 text-sm text-slate-600">{notFound ? t('notfound.text') : t('notfound.safe')}</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white">
        {t('notfound.go')}
      </Link>
    </div>
  )
}
