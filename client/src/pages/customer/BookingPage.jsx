import { CalendarDays, Clock, MapPin, Film, Armchair, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/Button'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import SeatMap from '../../components/SeatMap'
import bookingService from '../../services/bookingService'
import showtimeService from '../../services/showtimeService'
import { subscribeToSeatEvents } from '../../services/seatRealtimeService'
import { formatCurrency } from '../../utils/formatters'

const VIP_MULTIPLIER = 1.2
const COUPLE_MULTIPLIER = 2.0

function seatPrice(seat, basePrice) {
  if (seat.type === 'VIP') return basePrice * VIP_MULTIPLIER
  if (seat.type === 'COUPLE') return basePrice * COUPLE_MULTIPLIER
  return basePrice
}

export default function BookingPage() {
  const { showtimeId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const creatingBookingRef = useRef(false)
  const selectedSeatIdsRef = useRef(new Set())
  const reservationClientIdRef = useRef(null)
  // Mobile: hiện/ẩn panel tóm tắt
  const [showSummary, setShowSummary] = useState(false)

  const loadSeats = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    showtimeService
      .getSeats(showtimeId)
      .then((res) => {
        const d = res.data || res
        setData(d)
      })
      .catch((err) => {
        setError(err.message)
        setData(null)
      })
      .finally(() => { if (showLoading) setLoading(false) })
  }, [showtimeId])

  useEffect(() => { loadSeats(true) }, [loadSeats])

  useEffect(() => {
    reservationClientIdRef.current = globalThis.crypto?.randomUUID?.()
      || `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }, [])

  useEffect(() => {
    selectedSeatIdsRef.current = new Set(selected)
  }, [selected])

  // WebSocket là kênh cập nhật chính. Polling nhẹ là lớp dự phòng khi Redis
  // keyspace notifications hoặc kết nối STOMP tạm thời không hoạt động.
  useEffect(() => {
    const refreshSeats = () => {
      if (document.visibilityState === 'visible') loadSeats(false)
    }
    const timer = window.setInterval(refreshSeats, 1000)
    window.addEventListener('focus', refreshSeats)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshSeats)
    }
  }, [loadSeats])

  useEffect(() => subscribeToSeatEvents(
    showtimeId,
    (event) => {
      const affected = new Set(event.seatIds || [])
      const isOwnBookingHold = event.type === 'SEAT_HELD'
        && (
          event.reservationClientId === reservationClientIdRef.current
          || (!event.reservationClientId
            && creatingBookingRef.current
            && [...affected].every((seatId) => selectedSeatIdsRef.current.has(seatId)))
        )
      if (isOwnBookingHold) return

      const unavailable = event.type === 'SEAT_HELD' || event.type === 'BOOKING_PAID'
      setData((current) => {
        if (!current?.seats) return current
        return {
          ...current,
          seats: current.seats.map((seat) => {
            if (!affected.has(seat.id) || seat.status === 'INACTIVE') return seat
            if (event.type === 'SEAT_HELD') return { ...seat, status: 'HELD' }
            if (event.type === 'BOOKING_PAID') return { ...seat, status: 'BOOKED' }
            if (event.type === 'SEAT_RELEASED' || event.type === 'BOOKING_EXPIRED') {
              return { ...seat, status: 'AVAILABLE' }
            }
            return seat
          }),
        }
      })
      if (unavailable) {
        setSelected((items) => {
          const removed = items.some((id) => affected.has(id))
          if (removed) setError('Một hoặc nhiều ghế bạn đang chọn vừa được khách khác giữ. Vui lòng chọn ghế khác.')
          return items.filter((id) => !affected.has(id))
        })
      }
    },
    () => loadSeats(false),
  ), [showtimeId, loadSeats])

  const seats = useMemo(() => data?.seats || [], [data])
  const showtime = data?.showtime || {}
  const movie = data?.movie || {}
  const cinema = data?.cinema || {}
  const room = data?.room || {}
  const basePrice = Number(showtime.basePrice) || 0

  const selectedSeats = useMemo(
    () => selected.map((id) => seats.find((s) => s.id === id)).filter(Boolean),
    [selected, seats]
  )

  const totalAmount = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seatPrice(seat, basePrice), 0),
    [selectedSeats, basePrice]
  )
  const toggle = (seat) =>
    setSelected((items) => (items.includes(seat.id) ? items.filter((id) => id !== seat.id) : [...items, seat.id]))

  const submit = async () => {
    if (!selected.length) return setError('Vui lòng chọn ít nhất 1 ghế')
    try {
      setSubmitting(true)
      creatingBookingRef.current = true
      selectedSeatIdsRef.current = new Set(selected)
      setError('')
      const res = await bookingService.create({
        showtimeId: Number(showtimeId),
        seatIds: selected,
        reservationClientId: reservationClientIdRef.current,
      })
      const booking = res.data || res
      navigate(`/payment/${booking.id || booking.bookingId || 1}`)
    } catch (e) {
      setError(e.message)
      if (/ghế|giữ|thanh toán bởi người khác/i.test(e.message)) {
        setSelected([])
        loadSeats()
      }
    } finally {
      creatingBookingRef.current = false
      setSubmitting(false)
    }
  }

  if (loading) return <Loading label="Đang tải sơ đồ ghế..." />

  if (!data) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Notification type="error" message={error || 'Không thể tải thông tin suất chiếu.'} />
      </section>
    )
  }

  const startDate = showtime.startTime ? new Date(showtime.startTime) : null
  const endDate = showtime.endTime ? new Date(showtime.endTime) : null

  /* ─── Panel tóm tắt (dùng chung desktop + mobile) ─── */
  const SummaryPanel = (
    <div className="rounded-2xl glass p-4 space-y-4">
      <h3 className="text-base font-semibold text-white">Tóm tắt đặt vé</h3>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-2 text-dark-400">
          <span className="shrink-0">Phim</span>
          <span className="text-white font-medium text-right truncate max-w-[180px]">{movie.title}</span>
        </div>
        <div className="flex justify-between text-dark-400">
          <span className="shrink-0">Rạp</span>
          <span className="text-dark-300 text-right truncate max-w-[180px]">{cinema.name}</span>
        </div>
        <div className="flex justify-between text-dark-400">
          <span className="shrink-0">Phòng</span>
          <span className="text-dark-300">{room.name}</span>
        </div>
        <div className="flex justify-between text-dark-400">
          <span className="shrink-0">Suất chiếu</span>
          <span className="text-dark-300 text-right">
            {startDate ? startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--'}
            {' · '}
            {startDate ? startDate.toLocaleDateString('vi-VN') : ''}
          </span>
        </div>
      </div>

      <div className="border-t border-dark-700/50 pt-3">
        <p className="text-xs font-medium text-dark-400 mb-2">
          Ghế đã chọn ({selectedSeats.length})
        </p>
        {selectedSeats.length > 0 ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {selectedSeats.map((seat) => (
              <div key={seat.id} className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">
                  {seat.row}{seat.number}
                  <span className="ml-1.5 text-xs text-dark-500">({seat.type})</span>
                </span>
                <span className="text-dark-300">{formatCurrency(seatPrice(seat, basePrice))}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-dark-600 italic">Chưa chọn ghế nào</p>
        )}
      </div>

      <div className="border-t border-dark-700/50 pt-3 space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-dark-400">Tổng tiền</span>
          <span className="text-xl font-bold text-gradient">{formatCurrency(totalAmount)}</span>
        </div>
        <p className="text-xs text-dark-600">{selectedSeats.length} ghế · Giữ chỗ 1 phút</p>
      </div>

      <Button
        className="w-full"
        onClick={submit}
        disabled={!selected.length || submitting}
      >
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Đang xử lý...
          </>
        ) : (
          'Tiếp tục thanh toán'
        )}
      </Button>
    </div>
  )

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Fixed Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={movie.backdropUrl || movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80'}
          alt=""
          className="h-full w-full object-cover opacity-15 blur-lg"
        />
        <div className="absolute inset-0 bg-dark-950/80" />
      </div>

      <section className="relative z-10 mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-4 sm:py-6 animate-fade-in">

        {/* ── Showtime info header ── */}
        <div className="rounded-2xl glass p-3 sm:p-5">
          <div className="flex gap-3 sm:gap-5">
            {/* Poster — nhỏ hơn trên mobile */}
            {movie.posterUrl && (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="h-20 w-auto shrink-0 rounded-xl object-cover ring-1 ring-white/10 sm:h-32"
              />
            )}
            {/* Info */}
            <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
              <h1 className="text-lg font-bold leading-snug text-white sm:text-2xl line-clamp-2">
                {movie.title}
              </h1>
              {/* Meta row 1 */}
              <div className="flex flex-wrap gap-1.5 text-xs text-dark-400 sm:gap-3 sm:text-sm">
                <span className="inline-flex items-center gap-1">
                  <Film className="h-3 w-3 text-dark-500" />
                  {movie.durationMinutes || 0} phút
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-dark-500" />
                  {cinema.name}
                </span>
              </div>
              {/* Meta row 2 — badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-dark-800/50 px-2 py-1 text-xs text-dark-300">
                  <Armchair className="h-3 w-3 text-dark-500" />
                  {room.name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-dark-800/50 px-2 py-1 text-xs text-dark-300">
                  <CalendarDays className="h-3 w-3 text-dark-500" />
                  {startDate
                    ? startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '--'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-dark-800/50 px-2 py-1 text-xs text-dark-300">
                  <Clock className="h-3 w-3 text-dark-500" />
                  {startDate ? startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                  {' – '}
                  {endDate ? endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                </span>
                <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                  Từ {formatCurrency(basePrice)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Notification type="error" message={error} />

        {/* ── Desktop: 2 cột. Mobile: sơ đồ ghế toàn độ rộng ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">

          {/* Sơ đồ ghế */}
          <div>
            <h2 className="mb-2 text-base font-semibold text-white sm:text-lg">Chọn ghế</h2>
            <SeatMap seats={seats} selectedIds={selected} onToggle={toggle} />
          </div>

          {/* Panel tóm tắt — chỉ hiện trên desktop */}
          <div className="hidden lg:block lg:sticky lg:top-4 h-fit">
            {SummaryPanel}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          MOBILE: Sticky bottom bar
          ════════════════════════════════ */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-dark-800/60 bg-dark-900/95 backdrop-blur-md lg:hidden">
        {/* Expanded summary sheet */}
        {showSummary && (
          <div className="absolute bottom-full inset-x-0 max-h-[70vh] overflow-y-auto border-t border-dark-800/60 bg-dark-900/98 backdrop-blur-md animate-slide-up">
            <div className="p-4">
              {/* Close button */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Tóm tắt đặt vé</h3>
                <button
                  onClick={() => setShowSummary(false)}
                  aria-label="Đóng tóm tắt"
                  className="rounded-lg p-1.5 text-dark-400 hover:bg-dark-800 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {SummaryPanel}
            </div>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="flex items-center gap-3 px-4 py-3 safe-bottom">
          {/* Tóm tắt nhanh */}
          <button
            onClick={() => setShowSummary((v) => !v)}
            className="flex flex-1 flex-col items-start"
            aria-expanded={showSummary}
            aria-label="Xem tóm tắt đặt vé"
          >
            <span className="text-xs text-dark-500">
              {selectedSeats.length > 0
                ? `${selectedSeats.length} ghế đã chọn`
                : 'Chưa chọn ghế'}
            </span>
            <span className="text-lg font-bold text-gradient leading-tight">
              {formatCurrency(totalAmount)}
            </span>
          </button>

          <Button
            className="shrink-0 px-5"
            onClick={submit}
            disabled={!selected.length || submitting}
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Xử lý...
              </>
            ) : (
              'Thanh toán'
            )}
          </Button>
        </div>
      </div>

      {/* Padding bottom trên mobile để nội dung không bị che bởi sticky bar */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </div>
  )
}
