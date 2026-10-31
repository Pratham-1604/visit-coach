import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { applyLanguage } from './lib/i18n.js'
import { applyTheme } from './lib/theme.js'
import { router } from './router.jsx'

// Before the first render, so the page doesn't flash in the wrong theme.
applyTheme()
applyLanguage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
