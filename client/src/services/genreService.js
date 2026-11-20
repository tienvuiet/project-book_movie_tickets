import axiosClient from '../api/axiosClient'

const genreService = {
  getAll: (params) => axiosClient.get('/genres', { params }),
  create: (payload) => axiosClient.post('/genres', payload),
  update: (id, payload) => axiosClient.put(`/genres/${id}`, payload),
  remove: (id) => axiosClient.delete(`/genres/${id}`),
}

export default genreService
