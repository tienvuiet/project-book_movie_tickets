import axios from 'axios'
import { API_BASE_URL } from '../constants/api'
import { clearAuth, patchTokens, readAuth } from '../utils/authStorage'
import { friendlyError } from '../utils/errorMapper'

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  const token = readAuth()?.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    // Let the browser add the multipart boundary. Setting this header manually
    // can make Spring unable to read the movie, poster and backdrop parts.
    delete config.headers['Content-Type']
  }
  return config
})

let refreshPromise = null

axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    const errorCode = error?.response?.data?.errorCode
    const status = error?.response?.status
    const requestUrl = originalRequest?.url || ''
    const isAuthRequest = /\/auth\/(login|register|forgot-password|reset-password|refresh-token)(?:\?|$)/.test(requestUrl)
    const isAnonymousForbidden = status === 403 && !errorCode
    const isUnauthorized = status === 401 && (!errorCode || errorCode === 'TOKEN_EXPIRED' || errorCode === 'UNAUTHORIZED')
    const shouldRefresh = !isAuthRequest && (isUnauthorized || isAnonymousForbidden) && !originalRequest?._retry
    if (shouldRefresh) {
      originalRequest._retry = true
      try {
        const refreshToken = readAuth()?.refreshToken
        if (!refreshToken) throw new Error('Missing refresh token')
        refreshPromise ||= axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken })
        const response = await refreshPromise
        refreshPromise = null
        const data = response.data?.data || response.data
        patchTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        refreshPromise = null
        clearAuth()
        window.location.assign('/login')
        return Promise.reject(new Error(friendlyError(refreshError)))
      }
    }
    const normalized = new Error(friendlyError(error))
    normalized.status = status
    normalized.errorCode = errorCode
    return Promise.reject(normalized)
  },
)

export default axiosClient
