import { useEffect, useState } from 'react'
import { useProfile } from '../features/profile/hooks/useProfile'
import { useUpdateProfile } from '../features/profile/hooks/useUpdateProfile'

const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'JPY']

export function SettingsPage() {
  const profileQuery = useProfile()
  const updateProfile = useUpdateProfile()
  const [currency, setCurrency] = useState('INR')

  const profile = profileQuery.data?.users?.[0]

  useEffect(() => {
    if (profile?.currency) {
      setCurrency(profile.currency)
    }
  }, [profile?.currency])

  if (profileQuery.isLoading) {
    return (
      <section>
        <h1>Settings</h1>
        <p>Loading profile settings...</p>
      </section>
    )
  }

  if (profileQuery.isError || !profile) {
    return (
      <section>
        <h1>Settings</h1>
        <p className="error">Failed to load profile settings.</p>
      </section>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateProfile.mutateAsync({ currency })
  }

  return (
    <section>
      <h1>Settings</h1>
      <p className="muted">Profile preferences for localization and display.</p>

      <div className="table-wrap" style={{ padding: '1rem', maxWidth: '520px' }}>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <p style={{ marginBottom: '0.25rem' }}><strong>Name</strong></p>
            <p style={{ margin: 0 }}>{profile.first_name} {profile.last_name}</p>
          </div>

          <div>
            <p style={{ marginBottom: '0.25rem' }}><strong>Email</strong></p>
            <p style={{ margin: 0 }}>{profile.email}</p>
          </div>

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <label htmlFor="currency">Preferred Currency</label>
            <select
              id="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              disabled={updateProfile.isPending}
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="submit" disabled={updateProfile.isPending}>
              Save Settings
            </button>
            {updateProfile.isSuccess ? <span>Saved.</span> : null}
            {updateProfile.isError ? <span className="error">Failed to save.</span> : null}
          </div>
        </form>
      </div>
    </section>
  )
}