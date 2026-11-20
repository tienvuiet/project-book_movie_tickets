// ============================================================
// Voucher Mock Data — CGV Cinemas
// ============================================================

export const VOUCHER_STATUS = {
  ACTIVE: { label: 'Đang hoạt động', color: '#22c55e', bg: 'rgba(34,197,94,.15)', border: 'rgba(34,197,94,.3)' },
  DRAFT: { label: 'Nháp', color: '#94a3b8', bg: 'rgba(148,163,184,.12)', border: 'rgba(148,163,184,.25)' },
  PAUSED: { label: 'Tạm dừng', color: '#eab308', bg: 'rgba(234,179,8,.15)', border: 'rgba(234,179,8,.3)' },
  EXPIRED: { label: 'Hết hạn', color: '#ef4444', bg: 'rgba(239,68,68,.15)', border: 'rgba(239,68,68,.3)' },
  EXPIRING_SOON: { label: 'Sắp hết hạn', color: '#f97316', bg: 'rgba(249,115,22,.15)', border: 'rgba(249,115,22,.3)' },
}

export const DISCOUNT_TYPE = {
  PERCENT: { label: 'Phần trăm', symbol: '%' },
  FIXED: { label: 'Số tiền cố định', symbol: '₫' },
}

export const CUSTOMER_TARGET = {
  ALL: 'Tất cả',
  NEW: 'Khách hàng mới',
  MEMBER: 'Thành viên',
  VIP: 'VIP',
  SPECIFIC: 'Tài khoản cụ thể',
}

export const MOCK_VOUCHERS = [
  {
    id: 1,
    code: 'MOVIE20',
    name: 'Giảm 20% cho tất cả phim',
    description: 'Ưu đãi đặc biệt giảm 20% cho mọi đơn hàng đặt vé xem phim trong tháng 7.',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    status: 'ACTIVE',
    discountType: 'PERCENT',
    discountValue: 20,
    maxDiscount: 50000,
    minOrderValue: 200000,
    startDate: '2026-07-01T00:00:00',
    endDate: '2026-07-31T23:59:59',
    usedCount: 342,
    maxUsage: 500,
    maxPerUser: 1,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'ALL',
    allowStack: false,
    requireLogin: true,
    createdBy: 'Admin Trần',
    createdAt: '2026-06-25T10:00:00',
    updatedAt: '2026-07-10T08:30:00',
    totalRevenue: 68400000,
    totalDiscount: 8550000,
    successRate: 91.2,
    hasTransactions: true,
  },
  {
    id: 2,
    code: 'NEWUSER50K',
    name: 'Tặng 50.000đ cho khách hàng mới',
    description: 'Chào mừng khách hàng mới đến với CGV Cinemas! Giảm ngay 50.000đ cho lần đặt vé đầu tiên.',
    imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=800&q=80',
    status: 'ACTIVE',
    discountType: 'FIXED',
    discountValue: 50000,
    maxDiscount: null,
    minOrderValue: 150000,
    startDate: '2026-01-01T00:00:00',
    endDate: '2026-12-31T23:59:59',
    usedCount: 1205,
    maxUsage: 9999,
    maxPerUser: 1,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'NEW',
    allowStack: false,
    requireLogin: true,
    createdBy: 'Admin Trần',
    createdAt: '2025-12-28T09:00:00',
    updatedAt: '2026-01-02T12:00:00',
    totalRevenue: 180750000,
    totalDiscount: 60250000,
    successRate: 87.5,
    hasTransactions: true,
  },
  {
    id: 3,
    code: 'WEEKDAY10',
    name: 'Giảm 10% ngày thường',
    description: 'Áp dụng từ thứ Hai đến thứ Năm hàng tuần. Khuyến khích xem phim ngày thường.',
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
    status: 'ACTIVE',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 30000,
    minOrderValue: 100000,
    startDate: '2026-06-01T00:00:00',
    endDate: '2026-08-31T23:59:59',
    usedCount: 876,
    maxUsage: 2000,
    maxPerUser: 5,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'ALL',
    allowStack: false,
    requireLogin: false,
    weekdays: [1, 2, 3, 4],
    createdBy: 'Marketing Team',
    createdAt: '2026-05-20T14:00:00',
    updatedAt: '2026-06-01T00:00:00',
    totalRevenue: 52560000,
    totalDiscount: 13140000,
    successRate: 78.3,
    hasTransactions: true,
  },
  {
    id: 4,
    code: 'VIP100K',
    name: 'Ưu đãi VIP giảm 100.000đ',
    description: 'Đặc quyền dành riêng cho thành viên VIP của CGV Cinemas.',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    status: 'ACTIVE',
    discountType: 'FIXED',
    discountValue: 100000,
    maxDiscount: null,
    minOrderValue: 300000,
    startDate: '2026-07-01T00:00:00',
    endDate: '2026-07-31T23:59:59',
    usedCount: 48,
    maxUsage: 200,
    maxPerUser: 2,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'VIP',
    allowStack: false,
    requireLogin: true,
    createdBy: 'Admin Lê',
    createdAt: '2026-06-28T16:00:00',
    updatedAt: '2026-07-01T00:00:00',
    totalRevenue: 14400000,
    totalDiscount: 4800000,
    successRate: 95.8,
    hasTransactions: true,
  },
  {
    id: 5,
    code: 'SUMMER25',
    name: 'Hè rực rỡ - Giảm 25%',
    description: 'Ưu đãi mùa hè đặc biệt, áp dụng cuối tuần.',
    status: 'EXPIRING_SOON',
    discountType: 'PERCENT',
    discountValue: 25,
    maxDiscount: 75000,
    minOrderValue: 250000,
    startDate: '2026-06-15T00:00:00',
    endDate: '2026-07-25T23:59:59',
    usedCount: 189,
    maxUsage: 300,
    maxPerUser: 1,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'ALL',
    allowStack: false,
    requireLogin: true,
    createdBy: 'Marketing Team',
    createdAt: '2026-06-10T10:00:00',
    updatedAt: '2026-06-15T00:00:00',
    totalRevenue: 28350000,
    totalDiscount: 10500000,
    successRate: 82.4,
    hasTransactions: true,
  },
  {
    id: 6,
    code: 'FLASH30K',
    name: 'Flash Sale giảm 30.000đ',
    description: 'Flash sale 24h - giảm ngay 30.000đ mọi đơn hàng.',
    status: 'PAUSED',
    discountType: 'FIXED',
    discountValue: 30000,
    maxDiscount: null,
    minOrderValue: 120000,
    startDate: '2026-07-15T00:00:00',
    endDate: '2026-07-16T23:59:59',
    usedCount: 67,
    maxUsage: 500,
    maxPerUser: 1,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'ALL',
    allowStack: false,
    requireLogin: false,
    createdBy: 'Admin Trần',
    createdAt: '2026-07-14T08:00:00',
    updatedAt: '2026-07-15T10:00:00',
    totalRevenue: 2010000,
    totalDiscount: 2010000,
    successRate: 68.5,
    hasTransactions: true,
  },
  {
    id: 7,
    code: 'TETNEW2026',
    name: 'Tết Nguyên Đán 2026',
    description: 'Chúc mừng năm mới! Giảm 15% toàn bộ vé trong dịp Tết.',
    status: 'EXPIRED',
    discountType: 'PERCENT',
    discountValue: 15,
    maxDiscount: 60000,
    minOrderValue: 180000,
    startDate: '2026-01-25T00:00:00',
    endDate: '2026-02-10T23:59:59',
    usedCount: 2341,
    maxUsage: 5000,
    maxPerUser: 2,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'ALL',
    allowStack: false,
    requireLogin: false,
    createdBy: 'Admin Trần',
    createdAt: '2026-01-10T09:00:00',
    updatedAt: '2026-01-25T00:00:00',
    totalRevenue: 421380000,
    totalDiscount: 105345000,
    successRate: 93.1,
    hasTransactions: true,
  },
  {
    id: 8,
    code: 'TESTVOUCHER',
    name: 'Voucher thử nghiệm',
    description: 'Dùng nội bộ để kiểm tra hệ thống.',
    status: 'DRAFT',
    discountType: 'FIXED',
    discountValue: 10000,
    maxDiscount: null,
    minOrderValue: 50000,
    startDate: '2026-08-01T00:00:00',
    endDate: '2026-08-31T23:59:59',
    usedCount: 0,
    maxUsage: 10,
    maxPerUser: 1,
    applyToMovies: 'ALL',
    applyCinemas: 'ALL',
    customerTarget: 'ALL',
    allowStack: true,
    requireLogin: true,
    createdBy: 'Admin Lê',
    createdAt: '2026-07-20T11:00:00',
    updatedAt: '2026-07-20T11:00:00',
    totalRevenue: 0,
    totalDiscount: 0,
    successRate: 0,
    hasTransactions: false,
  },
]

// Lịch sử sử dụng voucher mẫu
export const MOCK_VOUCHER_HISTORY = [
  { id: 1, customer: 'Nguyễn Văn A', customerId: 101, bookingCode: 'BK-2026-00123', usedAt: '2026-07-18T14:30:00', discountAmount: 40000, status: 'SUCCESS', originalAmount: 200000, finalAmount: 160000 },
  { id: 2, customer: 'Trần Thị B', customerId: 102, bookingCode: 'BK-2026-00124', usedAt: '2026-07-18T16:20:00', discountAmount: 50000, status: 'SUCCESS', originalAmount: 250000, finalAmount: 200000 },
  { id: 3, customer: 'Lê Minh C', customerId: 103, bookingCode: 'BK-2026-00125', usedAt: '2026-07-19T10:00:00', discountAmount: 30000, status: 'REFUNDED', originalAmount: 150000, finalAmount: 120000 },
  { id: 4, customer: 'Phạm Thúy D', customerId: 104, bookingCode: 'BK-2026-00126', usedAt: '2026-07-19T19:45:00', discountAmount: 50000, status: 'SUCCESS', originalAmount: 300000, finalAmount: 250000 },
  { id: 5, customer: 'Hoàng Văn E', customerId: 105, bookingCode: 'BK-2026-00127', usedAt: '2026-07-20T09:15:00', discountAmount: 40000, status: 'FAILED', originalAmount: 200000, finalAmount: 200000 },
  { id: 6, customer: 'Đặng Thị F', customerId: 106, bookingCode: 'BK-2026-00128', usedAt: '2026-07-20T13:00:00', discountAmount: 50000, status: 'SUCCESS', originalAmount: 220000, finalAmount: 170000 },
  { id: 7, customer: 'Bùi Quang G', customerId: 107, bookingCode: 'BK-2026-00129', usedAt: '2026-07-21T17:30:00', discountAmount: 36000, status: 'SUCCESS', originalAmount: 180000, finalAmount: 144000 },
  { id: 8, customer: 'Vũ Thị H', customerId: 108, bookingCode: 'BK-2026-00130', usedAt: '2026-07-22T11:20:00', discountAmount: 50000, status: 'SUCCESS', originalAmount: 260000, finalAmount: 210000 },
]

// Dữ liệu biểu đồ sử dụng theo ngày
export const MOCK_USAGE_CHART = [
  { date: '14/07', count: 12, discount: 600000 },
  { date: '15/07', count: 28, discount: 1400000 },
  { date: '16/07', count: 35, discount: 1750000 },
  { date: '17/07', count: 18, discount: 900000 },
  { date: '18/07', count: 42, discount: 2100000 },
  { date: '19/07', count: 31, discount: 1550000 },
  { date: '20/07', count: 15, discount: 750000 },
  { date: '21/07', count: 38, discount: 1900000 },
  { date: '22/07', count: 44, discount: 2200000 },
  { date: '23/07', count: 29, discount: 1450000 },
]

// Helper functions
export const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0)

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const calcDiscount = (voucher, orderAmount) => {
  if (!voucher || orderAmount < voucher.minOrderValue) return 0
  if (voucher.discountType === 'PERCENT') {
    const raw = Math.floor(orderAmount * voucher.discountValue / 100)
    return voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw
  }
  return Math.min(voucher.discountValue, orderAmount)
}

export const getVoucherStats = (vouchers) => ({
  total: vouchers.length,
  active: vouchers.filter((v) => v.status === 'ACTIVE').length,
  expiringSoon: vouchers.filter((v) => v.status === 'EXPIRING_SOON').length,
  totalUsed: vouchers.reduce((s, v) => s + v.usedCount, 0),
  totalDiscount: vouchers.reduce((s, v) => s + v.totalDiscount, 0),
})

// Voucher có sẵn cho khách hàng (Payment page)
export const CUSTOMER_VOUCHERS = MOCK_VOUCHERS.filter((v) =>
  ['ACTIVE', 'EXPIRING_SOON'].includes(v.status)
).slice(0, 4)
