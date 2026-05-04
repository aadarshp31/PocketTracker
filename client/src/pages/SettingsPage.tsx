import { useEffect, useState } from 'react'
import { useProfile } from '../features/profile/hooks/useProfile'
import { useUpdateProfile } from '../features/profile/hooks/useUpdateProfile'
import { useAuth } from '../features/auth/contexts/AuthContext'

const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'JPY']

export function ProfilePage() {
  const profileQuery = useProfile()
  const updateProfile = useUpdateProfile()
  const { mfaFactors, enrollMfa, verifyMfaEnrollment, removeMfaFactor, refreshMfaState } = useAuth()
  const [currency, setCurrency] = useState('INR')
  const [mfaFriendlyName, setMfaFriendlyName] = useState('Authenticator App')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaSuccess, setMfaSuccess] = useState('')
  const [isMfaBusy, setIsMfaBusy] = useState(false)
  const [pendingEnrollment, setPendingEnrollment] = useState<{
    factorId: string
    qrCode: string
    secret: string
    uri: string
  } | null>(null)

  const profile = profileQuery.data?.users?.[0]

  useEffect(() => {
    if (profile?.currency) {
      setCurrency(profile.currency)
    }
  }, [profile?.currency])

  useEffect(() => {
    void refreshMfaState().catch(() => {
      // Profile page still works even if MFA state refresh fails.
    })
  }, [])

  if (profileQuery.isLoading) {
    return (
      <section>
        <h1>Profile</h1>
        <p>Loading profile settings...</p>
      </section>
    )
  }

  if (profileQuery.isError || !profile) {
    return (
      <section>
        <h1>Profile</h1>
        <p className="error">Failed to load profile settings.</p>
      </section>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateProfile.mutateAsync({ currency })
  }

  async function onStartMfaEnrollment() {
    setMfaError('')
    setMfaSuccess('')
    setIsMfaBusy(true)

    try {
      const enrollment = await enrollMfa(mfaFriendlyName.trim() || 'Authenticator App')
      setPendingEnrollment(enrollment)
    } catch (error: any) {
      setMfaError(error.message || 'Failed to start authenticator setup.')
    } finally {
      setIsMfaBusy(false)
    }
  }

  async function onVerifyMfaEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingEnrollment) return

    setMfaError('')
    setMfaSuccess('')
    setIsMfaBusy(true)

    try {
      await verifyMfaEnrollment(pendingEnrollment.factorId, mfaCode.trim())
      setPendingEnrollment(null)
      setMfaCode('')
      setMfaSuccess('Two-factor authentication is enabled for your account.')
    } catch (error: any) {
      setMfaError(error.message || 'Failed to verify authenticator code.')
    } finally {
      setIsMfaBusy(false)
    }
  }

  async function onRemoveMfaFactor(factorId: string) {
    setMfaError('')
    setMfaSuccess('')
    setIsMfaBusy(true)

    try {
      await removeMfaFactor(factorId)
      setMfaSuccess('Authenticator removed from your account.')
    } catch (error: any) {
      setMfaError(error.message || 'Failed to remove authenticator.')
    } finally {
      setIsMfaBusy(false)
    }
  }

  return (
    <section>
      <h1>Profile</h1>
      <p className="muted">Manage your account information and preferences.</p>

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

      <div className="table-wrap" style={{ padding: '1rem', maxWidth: '720px', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Two-Factor Authentication</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Protect your account with a time-based code from Google Authenticator, Microsoft Authenticator, or a similar app.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          Recovery option: keep a second authenticator enrolled on another device so you can still sign in if your main phone is unavailable.
        </p>

        {mfaSuccess ? <p>{mfaSuccess}</p> : null}
        {mfaError ? <p className="error">{mfaError}</p> : null}

        {mfaFactors.length > 0 ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {mfaFactors.map((factor, index) => (
              <div
                key={factor.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border, #ddd)',
                }}
              >
                <div>
                  <strong>{factor.friendlyName || `Authenticator App ${index + 1}`}</strong>
                  <p style={{ margin: '0.25rem 0 0' }}>Status: {factor.status}</p>
                </div>
                <button type="button" disabled={isMfaBusy} onClick={() => void onRemoveMfaFactor(factor.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '420px', marginTop: mfaFactors.length > 0 ? '1rem' : 0 }}>
          <label htmlFor="mfa-friendly-name">Authenticator Label</label>
          <input
            id="mfa-friendly-name"
            type="text"
            value={mfaFriendlyName}
            onChange={(event) => setMfaFriendlyName(event.target.value)}
            disabled={isMfaBusy || !!pendingEnrollment}
          />

          <button type="button" disabled={isMfaBusy || !!pendingEnrollment} onClick={() => void onStartMfaEnrollment()}>
            {isMfaBusy ? 'Starting setup...' : mfaFactors.length > 0 ? 'Add Backup Authenticator' : 'Enable Authenticator App'}
          </button>
        </div>

        {pendingEnrollment ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem', maxWidth: '420px' }}>
            <img
              src={pendingEnrollment.qrCode}
              alt="Scan this QR code in your authenticator app"
              style={{ width: '220px', height: '220px', border: '1px solid var(--color-border, #ddd)', padding: '0.5rem' }}
            />

            <div>
              <p style={{ marginBottom: '0.25rem' }}><strong>Manual setup code</strong></p>
              <code>{pendingEnrollment.secret}</code>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Add this in a second authenticator app if you want a backup sign-in option.
            </p>

            <form onSubmit={onVerifyMfaEnrollment} style={{ display: 'grid', gap: '0.75rem' }}>
              <label htmlFor="mfa-code">Enter 6-digit code</label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isMfaBusy}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={isMfaBusy || mfaCode.length !== 6}>
                  {isMfaBusy ? 'Verifying...' : 'Verify and Enable'}
                </button>
                <button
                  type="button"
                  disabled={isMfaBusy}
                  onClick={() => {
                    setPendingEnrollment(null)
                    setMfaCode('')
                    setMfaError('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  )
}