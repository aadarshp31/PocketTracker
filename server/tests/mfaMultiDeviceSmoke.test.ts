import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type MinimalMfaAuthClient = {
  auth: {
    mfa: {
      enroll: (params: { factorType: 'totp'; friendlyName: string }) => Promise<any>
      challengeAndVerify: (params: { factorId: string; code: string }) => Promise<any>
    }
  }
}

function decodeBase32(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleaned = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '')

  let bits = ''
  for (const char of cleaned) {
    const index = alphabet.indexOf(char)
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`)
    }
    bits += index.toString(2).padStart(5, '0')
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

  const otp = binary % 10 ** digits
  return otp.toString().padStart(digits, '0')
}

async function enrollAndVerifyTotp(
  userClient: MinimalMfaAuthClient,
  friendlyName: string
): Promise<{ factorId: string; secret: string }> {
  const enroll = await userClient.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  })

  if (enroll.error || !enroll.data?.id || !enroll.data?.totp?.secret) {
    throw enroll.error || new Error('Failed to enroll TOTP factor')
  }

  const code = generateTotp(enroll.data.totp.secret)
  const verify = await userClient.auth.mfa.challengeAndVerify({
    factorId: enroll.data.id,
    code,
  })

  if (verify.error) {
    throw verify.error
  }

  return {
    factorId: enroll.data.id,
    secret: enroll.data.totp.secret,
  }
}

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceRoleKey

  assert.ok(supabaseUrl, 'SUPABASE_URL is required')
  assert.ok(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required')
  assert.ok(anonKey, 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is required')

  const adminClient = createClient(supabaseUrl!, serviceRoleKey!)
  const userClient = createClient(supabaseUrl!, anonKey!)

  const email = `mfa_smoke_${Date.now()}@example.com`
  const password = 'Pocket123!Mfa'

  let userId: string | null = null

  try {
    const createUser = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createUser.error || !createUser.data.user) {
      throw createUser.error || new Error('Failed to create smoke-test user')
    }

    userId = createUser.data.user.id

    const initialSignIn = await userClient.auth.signInWithPassword({ email, password })
    if (initialSignIn.error) {
      throw initialSignIn.error
    }

    const primary = await enrollAndVerifyTotp(userClient, 'Primary Device')
    const backup = await enrollAndVerifyTotp(userClient, 'Backup Device')

    assert.notEqual(primary.factorId, backup.factorId, 'Expected two distinct MFA factors')

    await userClient.auth.signOut({ scope: 'local' })

    const secondSignIn = await userClient.auth.signInWithPassword({ email, password })
    if (secondSignIn.error) {
      throw secondSignIn.error
    }

    const factorsResult = await userClient.auth.mfa.listFactors()
    if (factorsResult.error) {
      throw factorsResult.error
    }

    const verifiedFactors = (factorsResult.data.totp || []).filter((factor) => factor.status === 'verified')
    assert.ok(verifiedFactors.length >= 2, 'Expected at least two verified TOTP factors')

    const assuranceBefore = await userClient.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceBefore.error) {
      throw assuranceBefore.error
    }

    assert.equal(assuranceBefore.data.currentLevel, 'aal1', 'Session should be aal1 right after password sign-in')

    const verifyWithBackup = await userClient.auth.mfa.challengeAndVerify({
      factorId: backup.factorId,
      code: generateTotp(backup.secret),
    })

    if (verifyWithBackup.error) {
      throw verifyWithBackup.error
    }

    const assuranceAfter = await userClient.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceAfter.error) {
      throw assuranceAfter.error
    }

    assert.equal(assuranceAfter.data.currentLevel, 'aal2', 'Session should be aal2 after backup factor verification')

    console.log('mfaMultiDeviceSmoke.test.ts: PASS')
    console.log(`Created and tested two factors for user ${email}`)
  } catch (error) {
    console.error('mfaMultiDeviceSmoke.test.ts: FAIL')
    console.error(error)
    process.exitCode = 1
  } finally {
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId, true)
    }
  }
}

void run()
