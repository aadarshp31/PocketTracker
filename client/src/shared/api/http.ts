import axios from 'axios'
import { supabase } from './supabaseClient'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
})

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

