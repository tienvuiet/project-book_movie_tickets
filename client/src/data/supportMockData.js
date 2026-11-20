/**
 * supportMockData.js
 * Dữ liệu mẫu cho tính năng Hỗ Trợ Trực Tuyến Theo Rạp (prototype UI).
 * Không kết nối backend — chỉ dùng cho giao diện tĩnh.
 */

// ─── Rạp chiếu phim ───────────────────────────────────────────────────────────
export const CINEMAS = [
  {
    id: 'c1',
    name: 'Cinema Quận 1',
    shortAddress: '123 Lê Lợi, Q.1, TP.HCM',
    address: '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    phone: '028 3822 1111',
    distance: '1,2 km',
    online: true,
    staffCount: 3,
  },
  {
    id: 'c2',
    name: 'Cinema Quận 3',
    shortAddress: '45 Võ Văn Tần, Q.3, TP.HCM',
    address: '45 Võ Văn Tần, Phường 6, Quận 3, TP. Hồ Chí Minh',
    phone: '028 3930 2222',
    distance: '3,5 km',
    online: true,
    staffCount: 2,
  },
  {
    id: 'c3',
    name: 'Cinema Thủ Đức',
    shortAddress: '78 Võ Văn Ngân, TP.Thủ Đức',
    address: '78 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP.HCM',
    phone: '028 3720 3333',
    distance: '8,1 km',
    online: false,
    staffCount: 0,
  },
  {
    id: 'c4',
    name: 'Cinema Bình Thạnh',
    shortAddress: '12 Đinh Tiên Hoàng, Q.Bình Thạnh',
    address: '12 Đinh Tiên Hoàng, Phường 1, Quận Bình Thạnh, TP.HCM',
    phone: '028 3511 4444',
    distance: '5,7 km',
    online: true,
    staffCount: 1,
  },
]

// ─── Nhân viên ────────────────────────────────────────────────────────────────
export const STAFF_LIST = [
  { id: 's1', name: 'Nguyễn Văn An', avatar: 'NV', cinemaId: 'c1', online: true },
  { id: 's2', name: 'Trần Thị Bích', avatar: 'TB', cinemaId: 'c1', online: true },
  { id: 's3', name: 'Lê Minh Châu', avatar: 'LC', cinemaId: 'c2', online: true },
  { id: 's4', name: 'Phạm Quốc Dũng', avatar: 'PD', cinemaId: 'c3', online: false },
]

// ─── Booking mẫu ──────────────────────────────────────────────────────────────
export const SAMPLE_BOOKINGS = {
  BK2026001: {
    bookingCode: 'BK2026001',
    movieTitle: 'Avengers: Doomsday',
    moviePoster:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=80&q=80',
    cinemaId: 'c1',
    cinemaName: 'Cinema Quận 1',
    roomName: 'Phòng 3 - IMAX',
    showtime: 'Thứ Sáu, 25/07/2026 — 19:30',
    seats: 'G7, G8',
    totalPrice: '320.000 ₫',
    paymentMethod: 'Thẻ ngân hàng',
    paymentStatus: 'PAID',
  },
  BK2026002: {
    bookingCode: 'BK2026002',
    movieTitle: 'Godzilla x Kong: Kỷ Nguyên Mới',
    moviePoster:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&q=80',
    cinemaId: 'c2',
    cinemaName: 'Cinema Quận 3',
    roomName: 'Phòng 1 - 4DX',
    showtime: 'Thứ Bảy, 26/07/2026 — 21:00',
    seats: 'D5',
    totalPrice: '165.000 ₫',
    paymentMethod: 'Ví điện tử MoMo',
    paymentStatus: 'PENDING',
  },
}

// ─── Chủ đề hỗ trợ ────────────────────────────────────────────────────────────
export const SUPPORT_TOPICS = [
  { id: 'booking', label: 'Đặt vé', icon: 'Ticket' },
  { id: 'payment', label: 'Thanh toán', icon: 'CreditCard' },
  { id: 'seat', label: 'Ghế ngồi', icon: 'Armchair' },
  { id: 'schedule', label: 'Lịch chiếu', icon: 'Calendar' },
  { id: 'service', label: 'Dịch vụ tại rạp', icon: 'Star' },
  { id: 'other', label: 'Vấn đề khác', icon: 'MessageCircle' },
]

// ─── Trạng thái cuộc trò chuyện ───────────────────────────────────────────────
export const CONVERSATION_STATUS = {
  WAITING: {
    label: 'Đang chờ tiếp nhận',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
    dot: 'bg-amber-400',
  },
  IN_PROGRESS: {
    label: 'Đang được hỗ trợ',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.3)',
    dot: 'bg-blue-400',
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.3)',
    dot: 'bg-green-400',
  },
  CLOSED: {
    label: 'Đã đóng',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.12)',
    border: 'rgba(107,114,128,0.3)',
    dot: 'bg-slate-500',
  },
}

// ─── Cuộc trò chuyện mẫu (phía khách hàng) ───────────────────────────────────
export const MY_CONVERSATIONS = [
  {
    id: 'conv1',
    cinemaId: 'c1',
    cinemaName: 'Cinema Quận 1',
    topic: 'Thanh toán',
    topicId: 'payment',
    status: 'IN_PROGRESS',
    staffName: 'Nguyễn Văn An',
    lastMessage: 'Bạn vui lòng kiểm tra lại thông tin thẻ và thử lại nhé.',
    lastMessageTime: '10:42',
    unread: 2,
    bookingCode: 'BK2026001',
    createdAt: '22/07/2026 10:30',
  },
  {
    id: 'conv2',
    cinemaId: 'c2',
    cinemaName: 'Cinema Quận 3',
    topic: 'Ghế ngồi',
    topicId: 'seat',
    status: 'RESOLVED',
    staffName: 'Lê Minh Châu',
    lastMessage: 'Rất vui được hỗ trợ bạn! Chúc bạn xem phim vui.',
    lastMessageTime: 'Hôm qua',
    unread: 0,
    bookingCode: null,
    createdAt: '21/07/2026 15:20',
  },
  {
    id: 'conv3',
    cinemaId: 'c1',
    cinemaName: 'Cinema Quận 1',
    topic: 'Đặt vé',
    topicId: 'booking',
    status: 'CLOSED',
    staffName: 'Trần Thị Bích',
    lastMessage: 'Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!',
    lastMessageTime: '20/07',
    unread: 0,
    bookingCode: null,
    createdAt: '20/07/2026 09:10',
  },
]

// ─── Tin nhắn mẫu trong 1 cuộc trò chuyện ────────────────────────────────────
export const SAMPLE_MESSAGES = [
  {
    id: 'm1',
    type: 'system',
    text: 'Cuộc trò chuyện đã bắt đầu lúc 10:30 • Chủ đề: Thanh toán',
    time: '10:30',
  },
  {
    id: 'm2',
    type: 'customer',
    text: 'Chào rạp, mình vừa đặt vé nhưng bị lỗi khi thanh toán, tiền đã bị trừ mà vé chưa xác nhận ạ.',
    time: '10:31',
    status: 'seen',
  },
  {
    id: 'm3',
    type: 'system',
    text: 'Nguyễn Văn An đã tiếp nhận cuộc trò chuyện • 10:32',
    time: '10:32',
  },
  {
    id: 'm4',
    type: 'staff',
    sender: 'Nguyễn Văn An',
    text: 'Xin chào! Mình là Văn An từ Cinema Quận 1. Bạn có thể cung cấp mã booking hoặc email đăng ký không ạ? Mình sẽ kiểm tra ngay cho bạn.',
    time: '10:33',
  },
  {
    id: 'm5',
    type: 'customer',
    text: 'Mã booking của mình là BK2026001 ạ.',
    time: '10:35',
    status: 'seen',
  },
  {
    id: 'm6',
    type: 'staff',
    sender: 'Nguyễn Văn An',
    text: 'Mình đã tìm thấy booking BK2026001. Hiện tại giao dịch đang ở trạng thái xử lý. Bạn vui lòng kiểm tra lại thông tin thẻ và thử lại nhé. Nếu vẫn lỗi mình sẽ hỗ trợ hoàn tiền cho bạn.',
    time: '10:42',
  },
]

// ─── Danh sách chat phía nhân viên ────────────────────────────────────────────
export const STAFF_CONVERSATIONS = [
  {
    id: 'conv1',
    customerName: 'Minh Khoa Trần',
    customerAvatar: 'MK',
    customerEmail: 'minhk***@gmail.com',
    customerPhone: '0901 ***  678',
    totalContacts: 3,
    topic: 'Thanh toán',
    topicId: 'payment',
    status: 'IN_PROGRESS',
    assignedTo: 's1',
    assignedName: 'Nguyễn Văn An',
    lastMessage: 'Mã booking của mình là BK2026001 ạ.',
    lastMessageTime: '10:35',
    waitTime: '5 phút',
    duration: '13 phút',
    unread: 1,
    bookingCode: 'BK2026001',
    source: 'Trang thanh toán',
    createdAt: '22/07/2026 10:30',
    messages: SAMPLE_MESSAGES,
  },
  {
    id: 'conv4',
    customerName: 'Lan Hương Nguyễn',
    customerAvatar: 'LH',
    customerEmail: 'lanhu***@yahoo.com',
    customerPhone: '0912 *** 345',
    totalContacts: 1,
    topic: 'Lịch chiếu',
    topicId: 'schedule',
    status: 'WAITING',
    assignedTo: null,
    assignedName: null,
    lastMessage: 'Rạp có chỗ gửi xe máy không ạ?',
    lastMessageTime: '10:55',
    waitTime: '12 phút',
    duration: null,
    unread: 3,
    bookingCode: null,
    source: 'Trang chủ',
    createdAt: '22/07/2026 10:43',
    messages: [
      {
        id: 'w1',
        type: 'system',
        text: 'Cuộc trò chuyện đã bắt đầu lúc 10:43 • Chủ đề: Lịch chiếu',
        time: '10:43',
      },
      {
        id: 'w2',
        type: 'customer',
        text: 'Cho mình hỏi hôm nay rạp có suất chiếu nào lúc 7-8 giờ tối không ạ?',
        time: '10:44',
        status: 'sent',
      },
      {
        id: 'w3',
        type: 'customer',
        text: 'Rạp có chỗ gửi xe máy không ạ?',
        time: '10:55',
        status: 'sent',
      },
    ],
  },
  {
    id: 'conv5',
    customerName: 'Đức Anh Phạm',
    customerAvatar: 'DA',
    customerEmail: 'ducanh***@gmail.com',
    customerPhone: '0968 *** 012',
    totalContacts: 7,
    topic: 'Ghế ngồi',
    topicId: 'seat',
    status: 'RESOLVED',
    assignedTo: 's2',
    assignedName: 'Trần Thị Bích',
    lastMessage: 'Rất vui được hỗ trợ bạn! Chúc bạn xem phim vui.',
    lastMessageTime: 'Hôm qua',
    waitTime: '2 phút',
    duration: '18 phút',
    unread: 0,
    bookingCode: 'BK2026002',
    source: 'Trang chọn ghế',
    createdAt: '21/07/2026 15:00',
    messages: [
      {
        id: 'r1',
        type: 'system',
        text: 'Cuộc trò chuyện đã bắt đầu lúc 15:00 • Chủ đề: Ghế ngồi',
        time: '15:00',
      },
      {
        id: 'r2',
        type: 'customer',
        text: 'Mình muốn đổi ghế D5 sang D7 được không ạ?',
        time: '15:01',
        status: 'seen',
      },
      {
        id: 'r3',
        type: 'staff',
        sender: 'Trần Thị Bích',
        text: 'Chào bạn! Rất tiếc ghế D7 hiện đã có người đặt. Bạn có muốn mình kiểm tra xem còn ghế nào gần đó không?',
        time: '15:03',
      },
      {
        id: 'r4',
        type: 'customer',
        text: 'Vâng bạn kiểm tra giúp mình với.',
        time: '15:04',
        status: 'seen',
      },
      {
        id: 'r5',
        type: 'staff',
        sender: 'Trần Thị Bích',
        text: 'Hiện còn D6 và E5 trống. Bạn muốn đổi sang ghế nào?',
        time: '15:06',
      },
      {
        id: 'r6',
        type: 'customer',
        text: 'Mình chọn D6 nhé.',
        time: '15:08',
        status: 'seen',
      },
      {
        id: 'r7',
        type: 'staff',
        sender: 'Trần Thị Bích',
        text: 'Mình đã đổi ghế cho bạn sang D6 rồi nhé. Vui lòng kiểm tra lại trong mục vé của bạn.',
        time: '15:10',
      },
      {
        id: 'r8',
        type: 'system',
        text: 'Trần Thị Bích đã đánh dấu cuộc trò chuyện là Đã giải quyết • 15:18',
        time: '15:18',
      },
      {
        id: 'r9',
        type: 'staff',
        sender: 'Trần Thị Bích',
        text: 'Rất vui được hỗ trợ bạn! Chúc bạn xem phim vui.',
        time: '15:18',
      },
    ],
  },
]
