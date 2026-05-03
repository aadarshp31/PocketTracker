import axios from 'axios'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
})

// Add request interceptor to include JWT token
http.interceptors.request.use(async (config) => {
  // Try to get token from localStorage (set by AuthContext)
  const token = localStorage.getItem('auth_token')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Add response interceptor to handle 401 errors
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth token and redirect to login if needed
      localStorage.removeItem('auth_token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

