/**
 * MFA Recovery Code Smoke Test
 *
 * Verifies the full recovery-code lifecycle end-to-end:
 *  1. Creates a test user and enrolls TOTP.
 *  2. Generates recovery codes via the API (simulated via direct service call using admin client).
 *  3. Signs out and back in with password only (aal1 session).
 *  4. Uses a recovery code via the /api/auth/recovery-codes/use endpoint.
 *  5. Verifies all TOTP factors are removed from Supabase.
 *  6. Verifies the used code is rejected on a second attempt.
 *  7. Cleans up the test user.
 *
 * Usage:
 *   npm run test:mfa-recovery-smoke
 */

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Minimal TOTP implementation (mirrors mfaMultiDeviceSmoke.test.ts)
// ---------------------------------------------------------------------------

function decodeBase32(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleaned = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '')
  let bits = ''
  for (const char of cleaned) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`)
    bits += idx.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function generateTotp(secret: string, timestampMs = Date.now(), timeStepSeconds = 30, digits = 6): string {
  const key = decodeBase32(secret)
  const counter = Math.floor(timestampMs / 1000 / timeStepSeconds)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return (binary % 10 ** digits).toString().padStart(digits, '0')
}

// ---------------------------------------------------------------------------
// Recovery code helpers — mirrors RecoveryCodeService logic
// ---------------------------------------------------------------------------

function hashCode(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext.replace(/\s/g, '').toLowerCase(), 'utf8').digest('hex')
}

function formatCode(hex: string): string {
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5001/api'

  assert.ok(supabaseUrl, 'SUPABASE_URL is required')
  assert.ok(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required')
  assert.ok(anonKey, 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is required')

  const adminClient = createClient(supabaseUrl!, serviceRoleKey!)
  const userClient = createClient(supabaseUrl!, anonKey!)

  const email = `mfa_recovery_smoke_${Date.now()}@example.com`
  const password = 'Pocket123!Recovery'
  let userId: string | null = null

  try {
    // 1. Create test user
    const createUser = await adminClient.auth.admin.createUser({ email, password, email_confirm: true })
    assert.ok(!createUser.error && createUser.data.user, 'Failed to create test user')
    userId = createUser.data.user.id
    console.log(`Created test user: ${email} (${userId})`)

    // 2. Sign in and enroll TOTP
    const signIn1 = await userClient.auth.signInWithPassword({ email, password })
    assert.ok(!signIn1.error, 'Initial sign-in failed')

    const enroll = await userClient.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Smoke Test Device' })
    assert.ok(!enroll.error && enroll.data?.id && enroll.data?.totp?.secret, 'TOTP enrollment failed')
    const factorId = enroll.data.id
    const secret = enroll.data.totp.secret

    const verify = await userClient.auth.mfa.challengeAndVerify({ factorId, code: generateTotp(secret) })
    assert.ok(!verify.error, 'TOTP verification failed')

    // Refresh to aal2
    await userClient.auth.refreshSession()

    // 3. Generate recovery codes via the server API (user must be aal2)
    const { data: sessionData } = await userClient.auth.getSession()
    const aal2Token = sessionData.session?.access_token
    assert.ok(aal2Token, 'Expected aal2 session token')

    const generateRes = await fetch(`${apiBaseUrl}/auth/recovery-codes/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aal2Token}` },
    })
    assert.equal(generateRes.status, 200, `Generate codes returned ${generateRes.status}`)
    const { codes } = await generateRes.json() as { codes: string[] }
    assert.equal(codes.length, 10, 'Expected 10 recovery codes')
    console.log('Generated 10 recovery codes')

    // 4. Check status endpoint
    const statusRes = await fetch(`${apiBaseUrl}/auth/recovery-codes/status`, {
      headers: { Authorization: `Bearer ${aal2Token}` },
    })
    assert.equal(statusRes.status, 200, `Status returned ${statusRes.status}`)
    const status = await statusRes.json() as { total: number; remaining: number }
    assert.equal(status.total, 10)
    assert.equal(status.remaining, 10)
    console.log('Status endpoint: 10/10 remaining ✓')

    // 5. Sign out and back in (aal1 only — no MFA step)
    await userClient.auth.signOut()
    const signIn2 = await userClient.auth.signInWithPassword({ email, password })
    assert.ok(!signIn2.error, 'Second sign-in failed')

    const { data: aal1Session } = await userClient.auth.getSession()
    const aal1Token = aal1Session.session?.access_token
    assert.ok(aal1Token, 'Expected aal1 session token after re-sign-in')
    console.log('Re-signed in with password only (aal1)')

    // 6. Use a recovery code
    const codeToUse = codes[0]
    const useRes = await fetch(`${apiBaseUrl}/auth/recovery-codes/use`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aal1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: codeToUse }),
    })
    assert.equal(useRes.status, 200, `Use code returned ${useRes.status}: ${await useRes.text()}`)
    console.log(`Recovery code used successfully: ${codeToUse}`)

    // 7. Verify all TOTP factors are removed
    const factorsAfter = await adminClient.auth.admin.mfa.listFactors({ userId: userId! })
    const remainingVerified = (factorsAfter.data?.factors || []).filter((f) => f.status === 'verified')
    assert.equal(remainingVerified.length, 0, 'Expected all TOTP factors to be unenrolled after recovery')
    console.log('All TOTP factors removed from Supabase ✓')

    // 8. Verify the used code is rejected on a second attempt
    const useAgainRes = await fetch(`${apiBaseUrl}/auth/recovery-codes/use`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aal1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: codeToUse }),
    })
    assert.equal(useAgainRes.status, 400, 'Expected 400 for already-used recovery code')
    console.log('Already-used code correctly rejected with 400 ✓')

    console.log('\nmfaRecoveryCodeSmoke.test.ts: PASS')
  } catch (error) {
    console.error('\nmfaRecoveryCodeSmoke.test.ts: FAIL')
    console.error(error)
    process.exitCode = 1
  } finally {
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId, true)
      console.log(`Cleaned up test user ${userId}`)
    }
  }
}

void run()
