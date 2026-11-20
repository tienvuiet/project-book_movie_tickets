import axiosClient from '../api/axiosClient'

const userService = {
  getMe: () => axiosClient.get('/users/me'),
  getAll: (params) => axiosClient.get('/users', { params }),
  getById: (id) => axiosClient.get(`/users/${id}`),
  create: (payload) => axiosClient.post('/users', payload),
  update: (id, payload) => axiosClient.put(`/users/${id}`, payload),
  updateMe: (payload) => axiosClient.put('/users/me', payload),
  updateStatus: (id, status) => axiosClient.put(`/users/${id}/status`, { status }),
  updateRoles: (id, roles) => axiosClient.put(`/users/${id}/roles`, { roles }),
  remove: (id) => axiosClient.delete(`/users/${id}`),
}

export default userService
