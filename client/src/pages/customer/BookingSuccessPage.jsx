import { BadgePercent, CheckCircle2, ChevronLeft, Download, Home, Printer, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Button from '../../components/Button'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import bookingService from '../../services/bookingService'
import paymentService from '../../services/paymentService'
import { buildTicketQrPayload } from '../../utils/ticketQr'

export default function BookingSuccessPage() {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const printTicket = () => window.print()

  const downloadTicket = () => {
    document.title = `Ve-${booking?.bookingCode || bookingId}`
    window.print()
  }

  useEffect(() => {
    let cancelled = false
    let timer
    let attempts = 0
    const loadBooking = () => paymentService.getPayOSStatus(bookingId)
      .catch(() => null)
      .then(() => bookingService.getById(bookingId))
      .then((res) => {
        if (cancelled) return
        const data = res.data || res
        setBooking(data)
        setLoading(false)
        if (data.status !== 'PAID' && data.status !== 'COMPLETED' && attempts < 10) {
          attempts += 1
          timer = window.setTimeout(loadBooking, 2000)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    loadBooking()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [bookingId])

  if (loading) return <Loading label="Đang tải thông tin vé..." />
  if (!booking) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Notification type="error" message={error || 'Không tìm thấy thông tin đơn hàng.'} />
      </section>
    )
  }

  if (booking.status !== 'PAID' && booking.status !== 'COMPLETED') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Loading label="Đang chờ payOS xác nhận thanh toán..." />
        <p className="mt-4 text-sm text-dark-400">Trang sẽ tự cập nhật trong vài giây. Bạn không cần thanh toán lại.</p>
        {error && <Notification type="error" message={error} />}
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
    .join(', ')

  const ticketQrPayload = buildTicketQrPayload(booking, bookingId)

  return (
    <div className="bg-dark-950 text-dark-200 min-h-screen py-12">
      <section className="mx-auto max-w-4xl px-4 animate-fade-in">
        {/* Success Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Đặt vé thành công!</h1>
          <p className="mt-2 text-dark-400">Vui lòng xuất trình mã QR tại rạp để nhận vé xem phim.</p>
        </div>

        {/* Ticket Card */}
        <div className="relative mx-auto max-w-[800px] overflow-hidden rounded-2xl bg-[#1a1c23] shadow-glass-lg flex flex-col md:flex-row">

          {/* Top/Left: Movie Poster */}
          <div className="relative w-full md:w-[320px] shrink-0">
            <Link to="/my-bookings" className="absolute top-4 left-4 z-10 flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white transition">
              <ChevronLeft className="h-4 w-4" /> Thanh Toán Thành Công - CGV Cinemas
            </Link>
            <img
              src={booking.moviePosterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba'}
              alt={booking.movieTitle}
              className="h-[300px] md:h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c23] via-[#1a1c23]/40 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <span className="mb-2 inline-block rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-dark-950">
                IMAX 2D
              </span>
              <h3 className="text-2xl font-bold text-white drop-shadow-md leading-tight">{booking.movieTitle}</h3>
              <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Thanh toán thành công
              </p>
            </div>
          </div>

          {/* Right: Ticket Details */}
          <div className="min-w-0 flex-1 p-5 sm:p-6 md:p-8 flex flex-col justify-between relative">
            {/* Tear line on desktop (left border) */}
            <div className="hidden md:block absolute -left-2 top-0 bottom-0 w-4 overflow-hidden pointer-events-none flex flex-col justify-between py-4">
              {/* Just visually cut out half circles if we wanted, but let's use CSS border or dots */}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 mb-8">
              <div>
                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1">Rạp</p>
                <p className="text-base font-bold text-white">{booking.cinemaName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1">Suất chiếu</p>
                <p className="text-base font-bold text-white">
                  {startDate ? startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {' - '}
                  {startDate ? startDate.toLocaleDateString('vi-VN') : ''}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1">Phòng chiếu</p>
                <p className="text-base font-bold text-white">{booking.roomName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1">Ghế</p>
                <p className="text-base font-bold text-red-400">{seatsDisplay}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1">Tổng tiền</p>
                {Number(booking.discountAmount || 0) > 0 ? (
                  <div>
                    <p className="text-xs text-dark-500 line-through">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format((booking.totalAmount || 0) + (booking.discountAmount || 0))}
                    </p>
                    <p className="text-base font-bold text-emerald-400">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(booking.totalAmount || 0)}
                    </p>
                  </div>
                ) : (
                  <p className="text-base font-bold text-white">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(booking.totalAmount || 0)}
                  </p>
                )}
              </div>
            </div>

            {/* Dotted divider */}
            <div className="relative flex items-center mb-6">
              <div className="absolute -left-10 h-6 w-6 rounded-full bg-dark-950" />
              <div className="h-0.5 flex-1 border-t-2 border-dashed border-dark-700/50" />
              <div className="absolute -right-10 h-6 w-6 rounded-full bg-dark-950" />
            </div>

            {/* Voucher badge */}
            {booking.promoCode && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3">
                <Tag className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-dark-400">Mã giảm giá đã dùng: </span>
                  <span className="font-mono font-bold text-red-400 tracking-widest">{booking.promoCode}</span>
                </div>
                {Number(booking.discountAmount || 0) > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">
                      -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(booking.discountAmount)}
                    </span>
                    <p className="text-[10px] text-dark-500">tiết kiệm</p>
                  </div>
                )}
              </div>
            )}

            {/* QR Code Section */}
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
                {/* QR và mã vé */}
                <div className="h-24 w-24 shrink-0 rounded-xl bg-white p-2">
                <QRCodeSVG
                  value={ticketQrPayload}
                  size={160}
                  level="L"
                  title={`Vé ${booking.bookingCode}`}
                  className="h-full w-full"
                />
                </div>
                <div className="min-w-0 w-full sm:flex-1">
                  <p className="text-xs font-medium text-dark-400 uppercase">Mã đặt vé</p>
                  <p className="mt-1 max-w-full break-all text-xl font-black leading-tight text-amber-500 sm:text-2xl lg:text-3xl lg:tracking-wider">#{booking.bookingCode}</p>
                  <p className="mt-1 text-[10px] text-dark-500 italic">Vui lòng không chia sẻ mã này với người lạ.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button onClick={downloadTicket} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-6 py-3 font-bold">
            <Download className="h-5 w-5" />
            Tải vé (PDF)
          </Button>
          <Button onClick={printTicket} variant="outline" className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border-dark-700 text-white rounded-xl px-6 py-3 font-bold">
            <Printer className="h-5 w-5" />
            In vé
          </Button>
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-dark-400 hover:text-white transition ml-2">
            <Home className="h-4 w-4" />
            Quay về trang chủ
          </Link>
        </div>
      </section>
    </div>
  )
}
