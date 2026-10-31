import { createSetting } from './settings.js'

// Light or dark. Starts from the phone's own setting until the user picks one (index.css has the dark colours).
const theme = createSetting('visitcoach.theme', () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
)

export const useTheme = theme.use

export function setTheme(value) {
  theme.set(value)
  applyTheme()
}

// Called once before the first render (main.jsx), so the page doesn't flash white.
export function applyTheme() {
  document.documentElement.classList.toggle('dark', theme.get() === 'dark')
}
