import { Monitor, Moon, Sun, Check } from 'lucide-react'
import { useTheme, type Theme } from './ThemeContext'

interface ThemeToggleProps {
  variant?: 'segmented' | 'compact'
  className?: string
}

export function ThemeToggle({ variant = 'segmented', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-toggle-compact ${className}`}
        title={`Current theme: ${theme} (${resolvedTheme}). Click to cycle.`}
        aria-label={`Current theme: ${theme}. Switch theme.`}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="theme-icon" size={18} />
        ) : (
          <Sun className="theme-icon" size={18} />
        )}
      </button>
    )
  }

  const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div
      className={`theme-segmented-group ${className}`}
      role="radiogroup"
      aria-label="Color theme selection"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-segmented-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => setTheme(value)}
            title={`${label} mode${value === 'system' ? ' (matches OS)' : ''}`}
          >
            <Icon size={14} className="theme-btn-icon" />
            <span className="theme-btn-label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AppearanceSettingsSection() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const themeCards: Array<{
    id: Theme
    title: string
    description: string
    icon: typeof Sun
    tag?: string
  }> = [
    {
      id: 'system',
      title: 'System Preference',
      description: 'Automatically synchronizes with your device or browser light / dark mode settings.',
      icon: Monitor,
      tag: 'Default',
    },
    {
      id: 'light',
      title: 'Light Mode',
      description: 'Crisp and bright presentation with soft sage and emerald tones.',
      icon: Sun,
    },
    {
      id: 'dark',
      title: 'Dark Mode',
      description: 'Deep obsidian and slate palette with vibrant emerald accents, ideal for low-light focus.',
      icon: Moon,
    },
  ]

  return (
    <div className="table-wrap appearance-settings-card" style={{ padding: '1.25rem', maxWidth: '960px', marginTop: '1rem' }}>
      <div className="appearance-header">
        <div>
          <h2 style={{ margin: '0 0 0.25rem' }}>Appearance & Theme</h2>
          <p className="muted" style={{ margin: 0 }}>
            Customize how PocketTracker looks. Your selection is automatically saved on this device.
          </p>
        </div>
        <div className="appearance-active-badge">
          <span className="appearance-active-dot" />
          <span>
            Active: <strong>{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</strong>
            {theme === 'system' && ' (System Auto)'}
          </span>
        </div>
      </div>

      <div className="appearance-grid">
        {themeCards.map(({ id, title, description, icon: Icon, tag }) => {
          const isSelected = theme === id
          return (
            <button
              key={id}
              type="button"
              className={`appearance-option-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setTheme(id)}
              aria-pressed={isSelected}
            >
              <div className="appearance-card-header">
                <div className="appearance-icon-wrap">
                  <Icon size={20} />
                </div>
                {tag ? <span className="appearance-tag">{tag}</span> : null}
                {isSelected ? (
                  <span className="appearance-check-badge" aria-hidden="true">
                    <Check size={14} />
                  </span>
                ) : null}
              </div>
              <div className="appearance-card-body">
                <h3 className="appearance-card-title">{title}</h3>
                <p className="appearance-card-desc">{description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
