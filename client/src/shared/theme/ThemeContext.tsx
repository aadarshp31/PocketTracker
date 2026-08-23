import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'

export type Theme = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'pt_theme'

export const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // Storage access might fail in restricted environments
  }
  return 'system'
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved

  // Update theme-color meta tag for mobile browsers
  let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
  if (!metaTheme) {
    metaTheme = document.createElement('meta')
    metaTheme.name = 'theme-color'
    document.head.appendChild(metaTheme)
  }
  metaTheme.content = resolved === 'dark' ? '#0e1613' : '#f5f7f2'
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = getStoredTheme()
    return initial === 'system' ? getSystemTheme() : initial
  })

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // Storage access might fail
    }
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }

  useEffect(() => {
    const updateResolvedTheme = () => {
      const currentResolved = theme === 'system' ? getSystemTheme() : theme
      setResolvedTheme(currentResolved)
      applyThemeToDocument(currentResolved)
    }

    updateResolvedTheme()

    if (theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      updateResolvedTheme()
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
