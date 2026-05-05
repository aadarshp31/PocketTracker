import axios from 'axios'
import { supabase } from './supabaseClient'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'
export const MFA_REQUIRED_EVENT = 'pt:mfa-required'

export interface MfaRequiredEventDetail {
  redirectTo: string
  message: string
}

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
})

export function isMfaRequiredHttpError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403 && error.response?.data?.code === 'mfa_required'
}

function emitMfaRequiredEvent() {
  const redirectTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const detail: MfaRequiredEventDetail = {
    redirectTo,
    message: 'Complete two-factor verification before accessing protected data.',
  }

  window.dispatchEvent(new CustomEvent<MfaRequiredEventDetail>(MFA_REQUIRED_EVENT, { detail }))
}

http.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    // Proceed without auth header; the server will return 401 if required
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isMfaRequiredHttpError(error)) {
      error.message = 'Complete two-factor verification before accessing protected data.'
      emitMfaRequiredEvent()
    }

    return Promise.reject(error)
  }
)

