import axiosClient from '../api/axiosClient'

const authService = {
  register: (payload) => axiosClient.post('/auth/register', payload),
  login: (payload) => axiosClient.post('/auth/login', payload),
  logout: (refreshToken) => axiosClient.post('/auth/logout', { refreshToken }),
  refreshToken: (refreshToken) => axiosClient.post('/auth/refresh-token', { refreshToken }),
  changePassword: (payload) => axiosClient.post('/auth/change-password', payload),
  forgotPassword: (email) => axiosClient.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => axiosClient.post('/auth/reset-password', payload),
  getCurrentUser: () => axiosClient.get('/users/me'),
}

export default authService
