const THEME_KEY = 'bookclub.theme'
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function getCachedTheme() {
  const value = localStorage.getItem(THEME_KEY)
  return ['LIGHT', 'DARK', 'SYSTEM'].includes(value) ? value : 'LIGHT'
}

export function applyTheme(preference = 'LIGHT') {
  const pref = ['LIGHT', 'DARK', 'SYSTEM'].includes(preference) ? preference : 'LIGHT'
  localStorage.setItem(THEME_KEY, pref)
  const dark = pref === 'DARK' || (pref === 'SYSTEM' && media && media.matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export function initTheme() {
  applyTheme(getCachedTheme())
  if (media) {
    media.addEventListener('change', () => {
      if (getCachedTheme() === 'SYSTEM') applyTheme('SYSTEM')
    })
  }
}
