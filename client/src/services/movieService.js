import axiosClient from '../api/axiosClient'

const movieService = {
  getAll: (params) => axiosClient.get('/movies', { params }),
  getById: (id) => axiosClient.get(`/movies/${id}`),
  create: (payload) => axiosClient.post('/movies', payload),
  update: (id, payload) => axiosClient.put(`/movies/${id}`, payload),
  remove: (id) => axiosClient.delete(`/movies/${id}`),
}

export default movieService
