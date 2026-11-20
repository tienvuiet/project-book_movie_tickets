import { Armchair, CalendarDays, CheckCircle2, ChevronRight, CircleDot, Clock, MapPin, QrCode, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import Button from '../../components/Button'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import VoucherSection from '../../components/voucher/VoucherSection'
import bookingService from '../../services/bookingService'
import paymentService from '../../services/paymentService'
import { formatCurrency } from '../../utils/formatters'

const methods = [
  { id: 'PAYOS', label: 'Chuyển khoản ngân hàng', description: 'Quét mã VietQR an toàn qua payOS', icon: QrCode, color: 'text-blue-400', bg: 'bg-blue-400/10' },
]

export default function PaymentPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paymentWasCancelled = searchParams.get('payos') === 'cancelled'
  const [method, setMethod] = useState('PAYOS')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const expirationNotified = useRef(false)
  const cancellationHandled = useRef(false)
  const [promoCode, setPromoCode] = useState('')
  const [clientDiscount, setClientDiscount] = useState(0)

  useEffect(() => {
    if (!paymentWasCancelled || cancellationHandled.current) return
    cancellationHandled.current = true

    // Cảnh báo: BE có thể đã lock link thanh toán khi PayOS được tạo.
    // Nếu booking đã có payOS link → BE sẽ từ chối tạo link mới cho đến khi link cũ hết hạn.
    toast.warning(
      'Bạn đã hủy chuyển khoản. Nếu link thanh toán đã được tạo, bạn cần đợi link cũ hết hạn trước khi thanh toán lại.',
      { id: `payment-cancelled-${bookingId}`, duration: 6000 },
    )
    // Chỉ bỏ tham số callback của payOS, không hủy booking và không giải phóng ghế.
    navigate(`/payment/${bookingId}`, { replace: true })
  }, [bookingId, navigate, paymentWasCancelled])

  useEffect(() => {
    if (paymentWasCancelled) return undefined
    bookingService.getById(bookingId)
      .then((res) => {
        const data = res.data || res
        setBooking(data)
        setPromoCode(data.promoCode || '')
        // Nếu booking đã có discount từ BE, dùng làm giá trị khởi tạo
        if (data.discountAmount) setClientDiscount(data.discountAmount)
        if (data.status === 'PAID' || data.status === 'COMPLETED') {
          navigate(`/success/${bookingId}`, { replace: true })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [bookingId, navigate, paymentWasCancelled])

  useEffect(() => {
    if (!booking?.expiresAt || booking.status !== 'PENDING') {
      setRemainingSeconds(0)
      return undefined
    }

    const serverRemainingMillis = Number(booking.remainingPaymentMillis)
    const serverRemainingSeconds = Number(booking.remainingPaymentSeconds)
    const createdAt = new Date(booking.createdAt).getTime()
    const expiresAt = new Date(booking.expiresAt).getTime()
    const bookingDurationMs = expiresAt - createdAt
    const deadline = Number.isFinite(serverRemainingMillis)
      ? Date.now() + Math.max(0, serverRemainingMillis)
      : Number.isFinite(serverRemainingSeconds)
        ? Date.now() + Math.max(0, serverRemainingSeconds) * 1000
      : Number.isFinite(bookingDurationMs) && bookingDurationMs > 0
        ? Date.now() + bookingDurationMs
        : expiresAt

    const updateCountdown = () => {
      const seconds = Number.isFinite(deadline)
        ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        : 0
      setRemainingSeconds(seconds)
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [booking])

  const expired = booking?.status === 'EXPIRED'
  const countdownElapsed = booking?.status === 'PENDING'
    && remainingSeconds !== null
    && remainingSeconds <= 0
  const paymentLocked = expired || countdownElapsed
  const displayedSeconds = remainingSeconds ?? 0
  const countdown = `${String(Math.floor(displayedSeconds / 60)).padStart(2, '0')}:${String(displayedSeconds % 60).padStart(2, '0')}`

  useEffect(() => {
    if (booking?.status !== 'PENDING' || remainingSeconds === null || remainingSeconds > 0) return undefined

    const refreshStatus = () => bookingService.getById(bookingId)
      .then((response) => setBooking(response.data || response))
      .catch((refreshError) => setError(refreshError.message))

    refreshStatus()
    const timer = window.setInterval(refreshStatus, 500)
    return () => window.clearInterval(timer)
  }, [booking?.status, bookingId, remainingSeconds])

  useEffect(() => {
    if (!expired || expirationNotified.current) return
    expirationNotified.current = true
    setSubmitting(false)
    toast.error('Đã hết thời gian thanh toán. Vui lòng đặt vé lại.', {
      id: `booking-expired-${bookingId}`,
    })
  }, [bookingId, expired])

  const checkout = async () => {
    if (paymentLocked) {
      toast.error(expired
        ? 'Đã hết thời gian thanh toán. Vui lòng đặt vé lại.'
        : 'Đang xác nhận thời hạn thanh toán, vui lòng chờ.', {
        id: expired ? `booking-expired-${bookingId}` : `booking-expiry-check-${bookingId}`,
      })
      return
    }
    try {
      setSubmitting(true)
      setError('')
      const response = await paymentService.checkout({ bookingId: Number(bookingId), method })
      const data = response.data || response
      if (!data.checkoutUrl) throw new Error('Không nhận được liên kết thanh toán từ payOS')
      window.location.assign(data.checkoutUrl)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) return <Loading label="Đang tải thông tin đơn hàng..." />
  if (!booking) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Notification type="error" message={error || 'Không tìm thấy thông tin đơn hàng.'} />
      </section>
    )
  }

  const startDate = booking.startTime ? new Date(booking.startTime) : null
  const seatsByRow = {}
  booking.seats?.forEach(s => {
    if (!seatsByRow[s.row]) seatsByRow[s.row] = []
    seatsByRow[s.row].push(s.number)
  })
  const seatsDisplay = Object.entries(seatsByRow)
    .map(([row, numbers]) => `${row}${numbers.join(', ')}`)
    .join(' - ')

  // Group seats by type for price breakdown
  const seatGroups = {}
  booking.seats?.forEach(s => {
    if (!seatGroups[s.type]) seatGroups[s.type] = { count: 0, price: s.price, total: 0 }
    seatGroups[s.type].count++
    seatGroups[s.type].total += s.price
  })
  const bookingSubtotal = Number(booking.totalAmount || 0) + Number(booking.discountAmount || 0)

  return (
    <div className="bg-dark-950 text-dark-200 min-h-screen pb-16">
      {/* Progress Bar */}
      <div className="border-b border-dark-800/50 bg-dark-900/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6">
          <div className="flex flex-col items-center gap-2 text-red-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-glow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold">Chọn ghế</span>
          </div>
          <div className="h-px flex-1 bg-red-500/50 mx-4" />
          <div className="flex flex-col items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 shadow-glow-sm">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold">Thanh toán</span>
          </div>
          <div className="h-px flex-1 bg-dark-800 mx-4" />
          <div className="flex flex-col items-center gap-2 text-dark-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-800">
              <QrCode className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold">Hoàn tất</span>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
        <Notification type="error" message={error} className="mb-6" />

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left Column - Payment Methods */}
          <div className="space-y-6">
            <div className="rounded-2xl glass p-6">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
                <Wallet className="h-5 w-5 text-red-500" />
                Phương thức thanh toán
              </h2>

              <div className="space-y-3">
                {methods.map((item) => {
                  const Icon = item.icon
                  const active = method === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setMethod(item.id)}
                      disabled={paymentLocked}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                        active
                          ? 'border-red-500/50 bg-red-500/5 shadow-glow-sm'
                          : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600 hover:bg-dark-800/50'
                      }`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-red-500' : 'border-dark-600'}`}>
                        {active && <div className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                      </div>
                      
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${item.bg || 'bg-white'}`}>
                        {item.image ? (
                          <img src={item.image} alt={`Logo ${item.label}`} className="h-full w-full object-contain" />
                        ) : (
                          <Icon className={`h-6 w-6 ${item.color}`} />
                        )}
                      </div>
                      
                      <div>
                        <p className={`font-semibold ${active ? 'text-white' : 'text-dark-200'}`}>
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs text-dark-500">{item.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <VoucherSection
                orderAmount={bookingSubtotal}
                bookingId={bookingId}
                paymentLocked={paymentLocked}
                hasPayOsLink={Boolean(booking?.paymentUrl || booking?.checkoutUrl)}
                initialCode={booking?.promoCode || ''}
                onVoucherChange={(v, d, updatedBooking) => {
                  if (updatedBooking) setBooking(updatedBooking)
                  if (v) {
                    setPromoCode(v.code)
                    setClientDiscount(Number(d || 0))
                  } else {
                    setPromoCode('')
                    setClientDiscount(0)
                  }
                }}
              />
          </div>

          {/* Right Column - Booking Summary */}
          <div>
            <div className="rounded-3xl glass overflow-hidden sticky top-24 shadow-glass-lg border-dark-700/50">
              {/* Poster Header */}
              <div className="relative h-48 w-full">
                <img
                  src={booking.moviePosterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba'}
                  alt={booking.movieTitle}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
                
                <div className="absolute bottom-4 left-5 right-5">
                  <span className="mb-2 inline-block rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white">
                    C13 - 13+
                  </span>
                  <h3 className="text-2xl font-bold text-white drop-shadow-md">{booking.movieTitle}</h3>
                </div>
              </div>

              {/* Booking Details */}
              <div className="p-5 space-y-4 text-sm">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold text-white">{booking.cinemaName}</p>
                    <p className="text-xs text-dark-400">{booking.roomName}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold text-white">
                      {startDate ? startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {', '}
                      {startDate ? startDate.toLocaleDateString('vi-VN', { weekday: 'long' }) : ''}
                    </p>
                    <p className="text-xs text-dark-400">
                      {startDate ? startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Armchair className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold text-white">Ghế: {seatsDisplay}</p>
                    <p className="text-xs text-dark-400">Tầng 3, Dãy trung tâm (Minh họa)</p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-dark-800 border-dashed mx-5 py-4 space-y-2 text-sm text-dark-300">
                {Object.entries(seatGroups).map(([type, group]) => (
                  <div key={type} className="flex justify-between">
                    <span>Ghế {type} (x{group.count})</span>
                    <span className="font-medium text-white">{formatCurrency(group.total)}</span>
                  </div>
                ))}
                {/* Ưu tiên discountAmount từ BE, fallback về clientDiscount khi đã chọn voucher */}
                {(Number(booking.discountAmount || 0) > 0 || clientDiscount > 0) && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Giảm giá {(booking.promoCode || promoCode) ? `(${booking.promoCode || promoCode})` : ''}</span>
                    <span className="font-semibold">-{formatCurrency(booking.discountAmount || clientDiscount)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="border-t border-dark-800 mx-5 py-5">
                <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 ${paymentLocked ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                  <div className="flex items-center gap-2 text-sm font-medium text-dark-300">
                    <Clock className={`h-4 w-4 ${paymentLocked ? 'text-red-400' : 'text-amber-400'}`} />
                    {expired
                      ? 'Đã hết thời gian thanh toán'
                      : countdownElapsed
                        ? 'Đang xác nhận thời hạn thanh toán'
                        : 'Thời gian thanh toán còn lại'}
                  </div>
                  <span className={`font-mono text-xl font-black tabular-nums ${paymentLocked ? 'text-red-400' : 'text-amber-300'}`}>
                    {countdown}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm font-semibold text-white">Tổng cộng</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(booking.totalAmount)}</div>
                    <div className="text-[10px] text-dark-500 uppercase tracking-wide">(Đã bao gồm VAT)</div>
                  </div>
                </div>

                <button
                  onClick={checkout}
                  disabled={submitting || paymentLocked}
                  aria-disabled={submitting || paymentLocked}
                  title={expired ? 'Đã hết thời gian thanh toán' : countdownElapsed ? 'Đang xác nhận thời hạn thanh toán' : undefined}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 font-bold text-white transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-dark-700 disabled:text-dark-400 disabled:opacity-100"
                >
                  {expired ? 'Đã hết thời gian thanh toán' : countdownElapsed ? 'Đang kiểm tra...' : submitting ? 'Đang xử lý...' : 'Thanh toán ngay'}
                  {!submitting && !paymentLocked && <ChevronRight className="h-5 w-5" />}
                </button>
              </div>

              {/* Footer mini */}
              <div className="bg-dark-950/50 p-4 text-[10px] text-dark-500 flex justify-around">
                <div className="flex flex-col items-center gap-1"><ShieldCheck className="h-4 w-4" /> Bảo mật</div>
                <div className="flex flex-col items-center gap-1"><Clock className="h-4 w-4" /> Hỗ trợ 24/7</div>
                <div className="flex flex-col items-center gap-1"><CircleDot className="h-4 w-4" /> Đổi trả</div>
              </div>
            </div>
            
            <p className="mt-4 text-center text-xs text-dark-500">
              Bằng việc nhấn thanh toán, bạn đồng ý với<br />
              <a href="#" className="text-dark-400 underline hover:text-dark-300">Điều khoản & Điều kiện</a> của chúng tôi.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
