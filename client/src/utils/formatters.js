/**
 * Shared formatting utilities — dates, money, status labels/colors.
 * Centralises formatting to avoid repeated code across all pages.
 */
import { format } from 'date-fns'

// Keep original exports so existing code doesn't break
export const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

export const formatDateTime = (value) =>
  value ? format(new Date(value), 'dd/MM/yyyy HH:mm') : '—'

// ─── Date / Time ─────────────────────────────────────────────────────────────

/** "14/07/2026" */
export function formatDate(iso) {
  if (!iso) return '—'
  return format(new Date(iso), 'dd/MM/yyyy')
}

/** "14:30" */
export function formatTime(iso) {
  if (!iso) return '—'
  return format(new Date(iso), 'HH:mm')
}

/** "Thứ Hai, 14/07/2026" */
export function formatDateLong(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** "YYYY-MM-DD" for API query params */
export function toDateParam(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return format(d, 'yyyy-MM-dd')
}

// ─── Money ───────────────────────────────────────────────────────────────────

/** "150.000 ₫" */
export function formatMoney(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Booking status ──────────────────────────────────────────────────────────

const BOOKING_STATUS_MAP = {
  PAID:      { label: 'Đã thanh toán', color: '#22c55e', bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.3)'   },
  PENDING:   { label: 'Chờ thanh toán',color: '#eab308', bg: 'rgba(234,179,8,.12)',   border: 'rgba(234,179,8,.3)'   },
  COMPLETED: { label: 'Đã check-in',  color: '#3b82f6', bg: 'rgba(59,130,246,.12)',  border: 'rgba(59,130,246,.3)'  },
  CANCELLED: { label: 'Đã hủy',       color: '#ef4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'   },
  EXPIRED:   { label: 'Hết hạn',      color: '#6b7280', bg: 'rgba(107,114,128,.12)', border: 'rgba(107,114,128,.3)' },
}

export function bookingStatusMeta(status) {
  return (
    BOOKING_STATUS_MAP[status] || {
      label: status || '—',
      color: '#6b7280',
      bg: 'rgba(107,114,128,.12)',
      border: 'rgba(107,114,128,.3)',
    }
  )
}

export function bookingStatusLabel(status) {
  return bookingStatusMeta(status).label
}

// ─── Showtime status ─────────────────────────────────────────────────────────

const SHOWTIME_STATUS_MAP = {
  UPCOMING:  { label: 'Sắp chiếu',   color: '#3b82f6', bg: 'rgba(59,130,246,.12)',  border: 'rgba(59,130,246,.3)'  },
  ONGOING:   { label: 'Đang chiếu',  color: '#22c55e', bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.3)'   },
  FINISHED:  { label: 'Đã kết thúc', color: '#6b7280', bg: 'rgba(107,114,128,.12)', border: 'rgba(107,114,128,.3)' },
  CANCELLED: { label: 'Đã hủy',      color: '#ef4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'   },
}

export function showtimeStatusMeta(status) {
  return (
    SHOWTIME_STATUS_MAP[status] || {
      label: status || '—',
      color: '#6b7280',
      bg: 'rgba(107,114,128,.12)',
      border: 'rgba(107,114,128,.3)',
    }
  )
}

/** Derive status from startTime / endTime if backend doesn't provide it */
export function computeShowtimeStatus(startTime, endTime) {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  if (now < start) return 'UPCOMING'
  if (now >= start && now <= end) return 'ONGOING'
  return 'FINISHED'
}

// ─── Fill-rate helpers ────────────────────────────────────────────────────────

export function fillRate(sold, total) {
  if (!total) return 0
  return Math.round((sold / total) * 100)
}

export function fillRateColor(rate) {
  if (rate >= 80) return '#ef4444'
  if (rate >= 50) return '#eab308'
  return '#22c55e'
}
