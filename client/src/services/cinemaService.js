import axiosClient from '../api/axiosClient'

const cinemaService = {
  getAll: (params) => axiosClient.get('/cinemas', { params }),
  create: (payload) => axiosClient.post('/cinemas', payload),
  update: (id, payload) => axiosClient.put(`/cinemas/${id}`, payload),
  remove: (id) => axiosClient.delete(`/cinemas/${id}`),
  getRooms: (cinemaId) => axiosClient.get(`/cinemas/${cinemaId}/rooms`),
  createRoom: (cinemaId, payload) => axiosClient.post(`/cinemas/${cinemaId}/rooms`, payload),
  updateRoom: (cinemaId, roomId, payload) => axiosClient.put(`/cinemas/${cinemaId}/rooms/${roomId}`, payload),
  removeRoom: (cinemaId, roomId) => axiosClient.delete(`/cinemas/${cinemaId}/rooms/${roomId}`),
  getSeats: (roomId) => axiosClient.get(`/rooms/${roomId}/seats`),
  createSeat: (roomId, payload) => axiosClient.post(`/rooms/${roomId}/seats`, payload),
  createSeatsBulk: (roomId, payload) => axiosClient.post(`/rooms/${roomId}/seats/bulk`, payload),
  updateSeat: (roomId, seatId, payload) => axiosClient.put(`/rooms/${roomId}/seats/${seatId}`, payload),
  removeSeat: (roomId, seatId) => axiosClient.delete(`/rooms/${roomId}/seats/${seatId}`),
}

export default cinemaService
