import axiosClient from '../api/axiosClient'

const reportService = {
  dashboard: () => axiosClient.get('/reports/dashboard'),
  revenue: (params) => axiosClient.get('/reports/revenue', { params }),
}

export default reportService
