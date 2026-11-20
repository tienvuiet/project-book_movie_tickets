import axiosClient from '../api/axiosClient'

const showtimeService = {
  getAll: (params) => axiosClient.get('/showtimes', { params }),
  getStaffAll: () => axiosClient.get('/showtimes/staff'),
  getByMovie: (movieId) => axiosClient.get(`/showtimes/by-movie/${movieId}`),
  create: (payload) => axiosClient.post('/showtimes', payload),
  update: (id, payload) => axiosClient.put(`/showtimes/${id}`, payload),
  remove: (id) => axiosClient.delete(`/showtimes/${id}`),
  getSeats: (id) => axiosClient.get(`/showtimes/${id}/seats`),
}

export default showtimeService
