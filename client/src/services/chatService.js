import axiosClient from '../api/axiosClient'

const unwrap = (response) => response?.data ?? response

const wait = (milliseconds) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))
const retryable = (error) => error?.status == null || error.status === 429 || error.status >= 500
const withRetry = async (operation, attempts = 3) => {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation() }
    catch (error) {
      lastError = error
      if (!retryable(error) || attempt === attempts - 1) throw error
      await wait(250 * (2 ** attempt))
    }
  }
  throw lastError
}

export const CHAT_SUBJECTS = {
  booking: 'BOOKING',
  payment: 'PAYMENT',
  seat: 'SEAT',
  schedule: 'SCHEDULE',
  service: 'CINEMA_SERVICE',
  other: 'OTHER',
}

export const CHAT_SOURCES = {
  home: 'HOME',
  'cinema-detail': 'CINEMA_DETAIL',
  'seat-select': 'SEAT_SELECTION',
  payment: 'PAYMENT',
  'booking-detail': 'BOOKING_DETAIL',
}

const SUBJECT_LABELS = {
  BOOKING: 'Đặt vé',
  PAYMENT: 'Thanh toán',
  SEAT: 'Ghế ngồi',
  SCHEDULE: 'Lịch chiếu',
  CINEMA_SERVICE: 'Dịch vụ tại rạp',
  OTHER: 'Vấn đề khác',
}

const SOURCE_LABELS = {
  HOME: 'Trang chủ',
  CINEMA_DETAIL: 'Chi tiết rạp',
  SEAT_SELECTION: 'Trang chọn ghế',
  PAYMENT: 'Trang thanh toán',
  BOOKING_DETAIL: 'Chi tiết vé',
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'KH'
const clock = (value) => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''
const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : ''
const elapsed = (value) => {
  if (!value) return '0 phút'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  return minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`
}

export function toUiMessage(message) {
  return {
    id: message.id,
    type: message.senderRole === 'SYSTEM' ? 'system' : message.senderRole === 'CUSTOMER' ? 'customer' : 'staff',
    sender: message.senderName,
    text: message.content,
    time: clock(message.createdAt),
    status: 'sent',
  }
}

export function toUiSentMessage(raw) {
  if (!raw) return null
  return {
    conversationId: raw.conversationId,
    conversationVersion: Number(raw.conversationVersion || 0),
    lastMessageId: raw.lastMessageId,
    lastMessageAt: raw.lastMessageAt,
    lastMessageContent: raw.lastMessageContent,
    lastMessageTime: clock(raw.lastMessageAt),
    message: toUiMessage(raw.message),
  }
}

export function toUiBooking(booking) {
  if (!booking) return null
  return {
    ...booking,
    showtime: booking.showtime ? new Date(booking.showtime).toLocaleString('vi-VN') : '',
    seats: Array.isArray(booking.seats) ? booking.seats.join(', ') : booking.seats,
    totalPrice: booking.totalAmount == null ? '—' : Number(booking.totalAmount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }),
    paymentMethod: booking.paymentMethod || 'Chưa thanh toán',
  }
}

export function toUiConversation(raw) {
  if (!raw) return null
  const messages = (raw.messages || []).map(toUiMessage)
  const last = messages.filter((message) => message.type !== 'system').at(-1) || messages.at(-1)
  return {
    ...raw,
    customerAvatar: initials(raw.customerName),
    customerEmail: raw.customerEmail || '—',
    customerPhone: raw.customerPhone || '—',
    totalContacts: Number(raw.totalContacts || 0),
    topic: SUBJECT_LABELS[raw.subject] || raw.subject,
    topicId: raw.subject,
    assignedTo: raw.assignedStaffId,
    assignedName: raw.assignedStaffName,
    lastMessage: raw.lastMessageContent || last?.text || 'Chưa có tin nhắn',
    lastMessageTime: clock(raw.lastMessageAt),
    waitTime: elapsed(raw.createdAt),
    duration: raw.resolvedAt ? elapsed(raw.createdAt) : null,
    unread: Number(raw.unreadCount || 0),
    booking: toUiBooking(raw.booking),
    bookingCode: raw.bookingCode || raw.booking?.bookingCode || null,
    source: SOURCE_LABELS[raw.sourcePage] || raw.sourcePage,
    createdAtLabel: dateTime(raw.createdAt),
    messages,
    nextBeforeId: raw.nextBeforeId || null,
    messagesHasMore: Boolean(raw.messagesHasMore),
  }
}

const chatService = {
  getUnreadCount: async () => unwrap(await axiosClient.get('/chat/unread-count')),
  getContext: async (params) => {
    const result = unwrap(await axiosClient.get('/chat/context', { params }))
    return { ...result, booking: toUiBooking(result?.booking) }
  },
  getCinemas: async () => unwrap(await axiosClient.get('/cinemas')),
  createConversation: async (payload) => toUiConversation(unwrap(await axiosClient.post('/chat/conversations', payload))),
  getMyConversations: async (params = {}) => {
    const page = unwrap(await axiosClient.get('/chat/conversations/me', { params })) || {}
    return { ...page, items: (page.items || []).map(toUiConversation) }
  },
  getConversation: async (id) => toUiConversation(unwrap(await axiosClient.get(`/chat/conversations/${id}`))),
  getMessages: async (id, params = {}) => {
    const page = unwrap(await axiosClient.get(`/chat/conversations/${id}/messages`, { params })) || {}
    return { ...page, items: (page.items || []).map(toUiMessage) }
  },
  markRead: async (id, lastReadMessageId) => withRetry(async () =>
    unwrap(await axiosClient.put(`/chat/conversations/${id}/read`, { lastReadMessageId }))),
  sendMessage: async (id, content, clientMessageId = globalThis.crypto.randomUUID()) => {
    return withRetry(async () => toUiSentMessage(unwrap(await axiosClient.post(
      `/chat/conversations/${id}/messages`, { content, clientMessageId },
    ))))
  },
  closeConversation: async (id) => toUiConversation(unwrap(await axiosClient.put(`/chat/conversations/${id}/close`))),
  reopenConversation: async (id) => toUiConversation(unwrap(await axiosClient.put(`/chat/conversations/${id}/reopen`))),
  getStaffConversations: async (params = {}) => {
    const page = unwrap(await axiosClient.get('/staff/chat/conversations', { params })) || {}
    return { ...page, items: (page.items || []).map(toUiConversation) }
  },
  acceptConversation: async (id) => toUiConversation(unwrap(await axiosClient.put(`/staff/chat/conversations/${id}/accept`))),
  resolveConversation: async (id) => toUiConversation(unwrap(await axiosClient.put(`/staff/chat/conversations/${id}/resolve`))),
}

export default chatService
