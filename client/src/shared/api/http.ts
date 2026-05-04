import axios from 'axios'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
})

let _authToken: string | null = null

export function setAuthToken(token: string | null) {
  _authToken = token
}

http.interceptors.request.use((config) => {
  if (_authToken) {
    config.headers.Authorization = `Bearer ${_authToken}`
  }
  return config
})

