import { useEffect, useState } from 'react'

// Load data once when a page opens.
// Usage: const { data, error, loading } = useFetch(() => getSchools(), [])
export function useFetch(load, deps) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // deps come from the caller, so the linter can't check them here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading }
}
