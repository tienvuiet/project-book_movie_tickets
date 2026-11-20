import axiosClient from '../api/axiosClient'

const normalizeBooking = (booking = {}) => ({
  ...booking,
  customerPhone: booking.customerPhone || '',
  moviePoster: booking.moviePoster || booking.moviePosterUrl || '',
  showtimeStartTime: booking.showtimeStartTime || booking.startTime,
  showtimeEndTime: booking.showtimeEndTime || booking.endTime,
  totalPrice: booking.totalPrice ?? booking.totalAmount ?? 0,
  checkinTime: booking.checkinTime || booking.checkedInAt,
  seats: (booking.seats || []).map((seat) => ({
    ...seat,
    seatName: seat.seatName || `${seat.row || ''}${seat.number || ''}`,
  })),
})

const bookingService = {
  create: (payload) => axiosClient.post('/bookings', payload),
  getMine: () => axiosClient.get('/bookings/me'),
  getAll: () => axiosClient.get('/bookings'),
  getById: (id) => axiosClient.get(`/bookings/${id}`),
  applyPromo: (id, promoCode) => axiosClient.put(`/bookings/${id}/promo`, { promoCode }),
  removePromo: async (id) => {
    // Thử DELETE trước (endpoint mới), fallback về PUT với code rỗng
    try {
      return await axiosClient.delete(`/bookings/${id}/promo`)
    } catch {
      return axiosClient.put(`/bookings/${id}/promo`, { promoCode: '' })
    }
  },
  cancel: (id) => axiosClient.put(`/bookings/${id}/cancel`),
  adminCancel: (id) => axiosClient.put(`/bookings/${id}/admin-cancel`),
  checkin: async (id) => {
    const response = await axiosClient.put(`/bookings/${id}/checkin`)
    return { ...response, data: normalizeBooking(response.data) }
  },
  getByCode: async (code) => {
    const response = await axiosClient.get(`/bookings/code/${encodeURIComponent(code)}`)
    return { ...response, data: normalizeBooking(response.data) }
  },
  searchStaff: async (params = {}) => {
    const response = await axiosClient.get('/bookings/staff')
    const keyword = params.keyword?.trim().toLowerCase()
    const filtered = (response.data || []).map(normalizeBooking).filter((booking) => {
      if (keyword) {
        const searchable = `${booking.bookingCode} ${booking.customerName} ${booking.customerEmail} ${booking.customerPhone} ${booking.movieTitle}`.toLowerCase()
        if (!searchable.includes(keyword)) return false
      }
      if (params.status && booking.status !== params.status) return false
      if (params.date && !booking.showtimeStartTime?.startsWith(params.date)) return false
      return true
    })
    const size = Number(params.size) || 10
    const page = Number(params.page) || 0
    const totalPages = Math.ceil(filtered.length / size)
    return {
      ...response,
      data: {
        content: filtered.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: filtered.length,
        totalPages,
      },
    }
  },
}

export default bookingService
