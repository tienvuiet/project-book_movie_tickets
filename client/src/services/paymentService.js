import axiosClient from '../api/axiosClient'

const paymentService = {
  checkout: (payload) => axiosClient.post('/payments/checkout', payload),
  getPayOSStatus: (bookingId) => axiosClient.get(`/payments/payos/status/${bookingId}`),
}

export default paymentService
