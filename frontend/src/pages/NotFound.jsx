import { Link, useRouteError } from 'react-router-dom'

// Shown for unknown links and for crashes on a page, instead of React Router's default error screen.
export default function NotFound() {
  const error = useRouteError()
  const notFound = !error || error.status === 404

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 text-center text-slate-900">
      <h1 className="text-xl font-semibold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {notFound ? 'This link does not open anything in VisitCoach.' : 'Your saved visits are safe on this phone.'}
      </p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white">
        Go to VisitCoach
      </Link>
    </div>
  )
}
