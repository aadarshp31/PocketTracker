import axios from 'axios'
import { supabase } from './supabaseClient'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
})

export function isMfaRequiredHttpError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403 && error.response?.data?.code === 'mfa_required'
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
    }

    return Promise.reject(error)
  }
)

