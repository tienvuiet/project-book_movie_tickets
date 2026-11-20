/**
 * promotionService.js
 * Dịch vụ quản lý khuyến mãi – kết nối API /api/promotions
 *
 * Admin APIs:
 *   getAll, getById, create, update, toggleActive, getStats
 * Customer APIs:
 *   getAvailable, validateCode, applyToBooking, removeFromBooking
 */
import axiosClient from '../api/axiosClient'

// ─── Formatter helpers ────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
})
const currencyValue = (value) => {
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) {
    const negative = value.startsWith('-')
    const [whole, fraction = ''] = value.replace('-', '').split('.')
    let rounded = BigInt(whole)
    if (fraction[0] && fraction[0] >= '5') rounded += 1n
    return negative ? -rounded : rounded
  }
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}
export const fmtVND = (n) => fmt.format(currencyValue(n))

// ─── Client-side error messages ───────────────────────────────────────────────
export const PROMO_ERRORS = {
  NOT_EXISTS:    'Mã khuyến mãi không tồn tại',
  NOT_STARTED:   'Khuyến mãi chưa bắt đầu có hiệu lực',
  EXPIRED:       'Khuyến mãi đã hết hạn sử dụng',
  MIN_ORDER:     (min) => `Đơn hàng chưa đạt tối thiểu ${fmtVND(min)}`,
  OUT_OF_STOCK:  'Mã khuyến mãi đã hết lượt sử dụng',
  USER_LIMIT:    'Tài khoản đã dùng hết lượt cho mã này',
  PAUSED:        'Khuyến mãi đang tạm dừng',
  INACTIVE:      'Khuyến mãi không còn hoạt động',
  PAYMENT_LOCKED:'Không thể thay đổi mã sau khi link thanh toán đã được tạo',
}

// ─── Client-side eligibility validator ───────────────────────────────────────
/**
 * Kiểm tra client-side nhanh.
 * @param {object} promo       – Promotion object từ API hoặc mock
 * @param {number} orderAmount – Tổng tiền đơn hàng (VND)
 * @returns {{ ok: boolean, reason?: string, discount?: number }}
 */
export function validatePromotion(promo, orderAmount = 0) {
  if (!promo) return { ok: false, reason: PROMO_ERRORS.NOT_EXISTS }

  const now = new Date()

  // Trạng thái
  if (promo.active === false || promo.status === 'INACTIVE' || promo.status === 'PAUSED')
    return { ok: false, reason: PROMO_ERRORS.INACTIVE }
  if (promo.status === 'EXPIRED')
    return { ok: false, reason: PROMO_ERRORS.EXPIRED }

  // Thời gian
  if (promo.startDate && new Date(promo.startDate) > now)
    return { ok: false, reason: PROMO_ERRORS.NOT_STARTED }
  if (promo.endDate && new Date(promo.endDate) < now)
    return { ok: false, reason: PROMO_ERRORS.EXPIRED }

  // Số lượt
  const used    = promo.usedCount    ?? promo.totalUsed    ?? 0
  const maxUse  = promo.maxUsage     ?? promo.maxUse       ?? promo.totalLimit ?? Infinity
  if (maxUse !== Infinity && used >= maxUse)
    return { ok: false, reason: PROMO_ERRORS.OUT_OF_STOCK }

  // Đơn tối thiểu
  const minOrder = promo.minOrderValue ?? promo.minimumOrderAmount ?? 0
  if (orderAmount > 0 && orderAmount < minOrder)
    return { ok: false, reason: PROMO_ERRORS.MIN_ORDER(minOrder) }

  // Tính discount
  const discount = calcDiscountAmount(promo, orderAmount)
  return { ok: true, discount }
}

/**
 * Tính số tiền được giảm (hỗ trợ cả field naming từ BE lẫn mock).
 */
export function calcDiscountAmount(promo, orderAmount) {
  if (!promo || orderAmount <= 0) return 0
  const type  = promo.discountType ?? promo.type ?? 'FIXED'
  const value = promo.discountValue ?? promo.value ?? 0
  const cap   = promo.maxDiscount  ?? promo.maximumDiscountAmount ?? null

  if (type === 'PERCENT' || type === 'PERCENTAGE') {
    const raw = Math.floor(orderAmount * value / 100)
    return cap ? Math.min(raw, cap) : raw
  }
  // FIXED
  return Math.min(value, orderAmount)
}

// ─── Normalize promo object (BE → unified shape) ─────────────────────────────
export function normalizePromo(raw = {}) {
  return {
    id:               raw.id,
    code:             raw.code          ?? raw.promoCode ?? '',
    name:             raw.name          ?? raw.promotionName ?? '',
    description:      raw.description   ?? '',
    imageUrl:         raw.imageUrl      ?? raw.bannerUrl ?? raw.image ?? '',
    discountType:     raw.discountType  ?? raw.type ?? 'FIXED',
    discountValue:    raw.discountValue ?? raw.value ?? 0,
    maxDiscount:      raw.maxDiscount   ?? raw.maximumDiscountAmount ?? null,
    minOrderValue:    raw.minOrderValue ?? raw.minimumOrderAmount ?? 0,
    startDate:        raw.startDate     ?? raw.validFrom ?? null,
    endDate:          raw.endDate       ?? raw.validTo   ?? null,
    maxUsage:         raw.maxUsage      ?? raw.totalLimit ?? null,
    usedCount:        raw.usedCount     ?? raw.totalUsed  ?? 0,
    maxPerUser:       raw.maxPerUser    ?? raw.userLimit  ?? 1,
    requireLogin:     raw.requireLogin  ?? true,
    allowStack:       raw.allowStack    ?? false,
    weekdays:         raw.weekdays      ?? [],
    applyToMovies:    raw.applyToMovies ?? 'ALL',
    applyCinemas:     raw.applyCinemas  ?? 'ALL',
    movieIds:         raw.movieIds      ?? [],
    cinemaIds:        raw.cinemaIds     ?? [],
    active:           raw.active        ?? raw.status === 'ACTIVE',
    status:           raw.status        ?? (raw.active ? 'ACTIVE' : 'INACTIVE'),
    createdBy:        raw.createdBy     ?? '',
    createdAt:        raw.createdAt     ?? null,
    updatedAt:        raw.updatedAt     ?? null,
    // Stats (khi có)
    totalRevenue:     raw.totalRevenue  ?? 0,
    totalDiscount:    raw.totalDiscount ?? raw.totalDiscountAmount ?? 0,
    successRate:      raw.successRate   ?? 0,
    holdCount:        raw.holdCount     ?? 0,
    refundedCount:    raw.refundedCount ?? 0,
  }
}

// ─── Admin API methods ────────────────────────────────────────────────────────
const promotionService = {

  /** Tổng lượt dùng và tổng tiền giảm trên toàn hệ thống, do database aggregate. */
  getSummary: async () => {
    const response = await axiosClient.get('/promotions/summary')
    const data = response?.data ?? response
    return {
      totalUsed: data?.totalUsed ?? '0',
      totalDiscount: data?.totalDiscount ?? '0',
    }
  },

  /**
   * Lấy danh sách khuyến mãi (admin).
   * @param {{ page?, size?, search?, status?, discountType? }} params
   */
  getAll: async (params = {}) => {
    try {
      const response = await axiosClient.get('/promotions', { params })
      const data = response?.data ?? response
      // Chuẩn hoá nhiều dạng response từ BE
      if (Array.isArray(data)) return { content: data.map(normalizePromo), totalElements: data.length, totalPages: 1, page: 0 }
      if (Array.isArray(data?.content)) return { ...data, content: data.content.map(normalizePromo) }
      if (Array.isArray(data?.data))    return { content: data.data.map(normalizePromo), totalElements: data.total ?? data.data.length, totalPages: data.totalPages ?? 1, page: 0 }
      return { content: [], totalElements: 0, totalPages: 1, page: 0 }
    } catch {
      return { content: [], totalElements: 0, totalPages: 1, page: 0 }
    }
  },

  /** Lấy chi tiết 1 khuyến mãi */
  getById: async (id) => {
    const data = await axiosClient.get(`/promotions/${id}`)
    return normalizePromo(data?.data ?? data)
  },

  /** Tạo khuyến mãi mới */
  create: (payload) => axiosClient.post('/promotions', payload),

  /** Cập nhật khuyến mãi */
  update: (id, payload) => axiosClient.put(`/promotions/${id}`, payload),

  /** Tải ảnh khuyến mãi lên Cloudinary qua server. */
  uploadImage: async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    const response = await axiosClient.post('/uploads/promotions', formData)
    const data = response?.data ?? response
    return data?.imageUrl ?? null
  },

  /**
   * Bật/tắt khuyến mãi.
   * @param {number} id
   * @param {boolean} active
   */
  toggleActive: (id, active) =>
    axiosClient.patch(`/promotions/${id}/active`, { active }),

  /**
   * Lấy thống kê sử dụng của 1 khuyến mãi.
   * Fallback về mock nếu BE chưa có endpoint.
   */
  getStats: async (id) => {
    try {
      const data = await axiosClient.get(`/promotions/${id}/stats`)
      return data?.data ?? data
    } catch {
      return null
    }
  },

  // ─── Customer API methods ───────────────────────────────────────────────────

  /**
   * Lấy danh sách khuyến mãi khả dụng cho khách.
   * @param {{ orderAmount?, movieId?, cinemaId?, showtimeId? }} params
   */
  getAvailable: async (params = {}) => {
    const response = await axiosClient.get('/promotions/available', { params })
    const data = response?.data ?? response
    const list = Array.isArray(data) ? data : (data?.content ?? [])
    return list.map(normalizePromo)
  },

  /**
   * Validate mã khuyến mãi theo code.
   * Kiểm tra mã bằng dữ liệu thật từ backend, sau đó xác nhận điều kiện ở client.
   * @param {string} code
   * @param {number} orderAmount
   * @returns {{ promo: object, discount: number }}
   */
  validateCode: async (code, orderAmount = 0) => {
    const upperCode = code.trim().toUpperCase()

    try {
      const response = await axiosClient.get('/promotions/validate', {
        params: { code: upperCode, orderAmount },
      })
      const data = response?.data ?? response
      const promo = normalizePromo(data)
      const { ok, reason, discount } = validatePromotion(promo, orderAmount)
      if (!ok) throw new Error(reason)
      return { promo, discount }
    } catch (apiErr) {
      throw new Error(apiErr.message || PROMO_ERRORS.NOT_EXISTS, { cause: apiErr })
    }
  },

  /**
   * Áp dụng mã vào booking.
   * @param {string|number} bookingId
   * @param {string} code
   */
  applyToBooking: (bookingId, code) =>
    axiosClient.put(`/bookings/${bookingId}/promo`, { promoCode: code }),

  /**
   * Bỏ mã khỏi booking.
   * Thử DELETE trước (endpoint mới), fallback PUT với code rỗng.
   * @param {string|number} bookingId
   */
  removeFromBooking: async (bookingId) => {
    try {
      return await axiosClient.delete(`/bookings/${bookingId}/promo`)
    } catch {
      return axiosClient.put(`/bookings/${bookingId}/promo`, { promoCode: '' })
    }
  },
}

export default promotionService
