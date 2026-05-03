import axios from 'axios'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
  withCredentials: true,
})

