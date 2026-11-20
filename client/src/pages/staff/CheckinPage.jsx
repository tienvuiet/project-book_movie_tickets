import { QrCode, Search, TicketCheck, Calendar, Clock, MapPin, User, Mail, Phone, CreditCard, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import Button from '../../components/Button'
import FormInput from '../../components/FormInput'
import Loading from '../../components/Loading'
import ModalConfirm from '../../components/ModalConfirm'
import bookingService from '../../services/bookingService'
import {
  formatDate,
  formatTime,
  formatMoney,
  bookingStatusMeta,
} from '../../utils/formatters'
import { useAuth } from '../../hooks/useAuth'

import { useLocation } from 'react-router-dom'
import { parseTicketQrPayload } from '../../utils/ticketQr'

export default function CheckinPage() {
  const { user } = useAuth()
  const location = useLocation()

  const [searchInput, setSearchInput] = useState(location.state?.code || '')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const lookupBooking = useCallback(async (rawCode, confirmAfterScan = false) => {
    const code = rawCode.trim().toUpperCase()
    if (!code) {
      setError('Vui lòng nhập mã vé')
      return
    }

    setLoading(true)
    setError(null)
    setBooking(null)

    try {
      const res = await bookingService.getByCode(code)
      const data = res.data
      
      // Additional client-side validation logic
      if (user?.cinemaId && data.cinemaId && user.cinemaId !== data.cinemaId) {
        setError('Vé này không thuộc rạp của bạn.')
        setLoading(false)
        return
      }

      setBooking(data)
      if (confirmAfterScan && data.status === 'PAID') setShowConfirm(true)
    } catch (err) {
      setError(err.message || 'Không tìm thấy vé')
    } finally {
      setLoading(false)
    }
  }, [user])

  const handleSearch = (e) => {
    if (e) e.preventDefault()
    lookupBooking(searchInput)
  }

  useEffect(() => {
    if (!scannerOpen) return undefined
    const scanner = new Html5Qrcode('staff-qr-reader')
    let stopped = false

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (stopped) return
            stopped = true
            let code = decodedText
            try {
              code = parseTicketQrPayload(decodedText).bookingCode
            } catch (parseError) {
              if (decodedText.trim().startsWith('{')) {
                setError(parseError.message || 'QR vé không hợp lệ')
                setScannerOpen(false)
                return
              }
            }
            setSearchInput(code)
            setScannerOpen(false)
            await lookupBooking(code, true)
          },
          () => {},
        )
      } catch (err) {
        setError(err.message || 'Không thể mở camera. Hãy cấp quyền camera cho trình duyệt.')
        setScannerOpen(false)
      }
    }

    startScanner()
    return () => {
      stopped = true
      if (scanner.isScanning) scanner.stop().catch(() => {})
      try { scanner.clear() } catch { /* scanner may already be cleared */ }
    }
  }, [scannerOpen, lookupBooking])

  useEffect(() => {
    if (!location.state?.code) return
    // A code selected from the lookup screen should be resolved immediately.

    lookupBooking(location.state.code)
    // Only react to a new navigation code; handleSearch uses the initialized input.
  }, [location.state?.code, lookupBooking])

  const handleCheckin = async () => {
    if (!booking || processing) return
    
    setProcessing(true)
    setError(null)
    try {
      await bookingService.checkin(booking.id)
      
      // Update local state without reload
      setBooking(prev => ({
        ...prev,
        status: 'COMPLETED',
        checkinTime: new Date().toISOString()
      }))
      toast.success('Check-in thành công! Đã xác nhận vé.')
      setShowConfirm(false)
    } catch (err) {
      const message = err.message || 'Lỗi khi check-in'
      setError(message)
      toast.error(message)
      setShowConfirm(false)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold text-white sm:text-2xl">Kiểm soát vé</h1>
      </div>

      {/* Search Section */}
      <div className="rounded-2xl glass p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <FormInput
              placeholder="Nhập mã vé (VD: BK-123456)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="text-lg py-3 uppercase"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="px-6">
              <Search className="h-5 w-5" />
              <span className="hidden sm:inline">Tra cứu</span>
            </Button>
            <Button type="button" variant="outline" className="px-4" title="Quét QR vé" onClick={() => setScannerOpen(true)}>
              <QrCode className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>

      {/* Status Messages */}
      {loading && <Loading label="Đang tìm kiếm thông tin vé..." />}
      {error && <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-sm text-red-400 flex items-center gap-3">
        <span className="shrink-0 h-5 w-5 text-red-400">⚠</span>{error}
      </div>}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-dark-700 bg-dark-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Quét QR vé</h2>
                <p className="text-sm text-dark-400">Đưa mã QR của khách vào giữa khung hình.</p>
              </div>
              <button type="button" onClick={() => setScannerOpen(false)} className="rounded-lg p-2 text-dark-400 hover:bg-dark-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div id="staff-qr-reader" className="overflow-hidden rounded-xl bg-black" />
          </div>
        </div>
      )}

      {/* Booking Details */}
      {booking && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 animate-slide-up">
          
          {/* Left: Customer & Showtime Info */}
          <div className="space-y-6">
            <div className="rounded-2xl glass p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-red-400" />
                Thông tin khách hàng
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-dark-800/40 rounded-xl p-3.5 border border-dark-700/50">
                  <p className="text-xs text-dark-500 font-medium uppercase mb-1">Khách hàng</p>
                  <p className="text-sm font-semibold text-white">{booking.customerName || '—'}</p>
                </div>
                <div className="bg-dark-800/40 rounded-xl p-3.5 border border-dark-700/50">
                  <p className="text-xs text-dark-500 font-medium uppercase mb-1">Email</p>
                  <div className="flex items-center gap-2 text-sm text-dark-200">
                    <Mail className="h-3.5 w-3.5 text-dark-400" />
                    {booking.customerEmail || '—'}
                  </div>
                </div>
                <div className="bg-dark-800/40 rounded-xl p-3.5 border border-dark-700/50">
                  <p className="text-xs text-dark-500 font-medium uppercase mb-1">Điện thoại</p>
                  <div className="flex items-center gap-2 text-sm text-dark-200">
                    <Phone className="h-3.5 w-3.5 text-dark-400" />
                    {booking.customerPhone || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl glass p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-red-400" />
                Thông tin suất chiếu
              </h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
                <img
                  src={booking.moviePoster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300'}
                  alt={booking.movieTitle}
                  className="w-20 h-28 sm:w-32 sm:h-44 object-cover rounded-xl shadow-md border border-dark-700/50 self-start"
                />
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-bold text-white leading-snug">{booking.movieTitle}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-dark-800 flex items-center justify-center border border-dark-700">
                        <MapPin className="h-4 w-4 text-dark-300" />
                      </div>
                      <div>
                        <p className="text-xs text-dark-500">Rạp & Phòng</p>
                        <p className="font-semibold text-dark-200">{booking.cinemaName} • Ph. {booking.roomName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-dark-800 flex items-center justify-center border border-dark-700">
                        <Clock className="h-4 w-4 text-dark-300" />
                      </div>
                      <div>
                        <p className="text-xs text-dark-500">Giờ chiếu</p>
                        <p className="font-semibold text-dark-200">
                          {formatTime(booking.showtimeStartTime)} • {formatDate(booking.showtimeStartTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Ticket Summary & Action */}
          <div className="space-y-6">
            <div className="rounded-2xl glass overflow-hidden relative">
              {/* Ticket cutouts */}
              <div className="absolute top-1/2 -left-3 h-6 w-6 rounded-full bg-dark-950 -translate-y-1/2" />
              <div className="absolute top-1/2 -right-3 h-6 w-6 rounded-full bg-dark-950 -translate-y-1/2" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 border-t-2 border-dashed border-dark-700/50 -translate-y-1/2" />

              <div className="p-6 pb-8">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-dark-400">Mã vé</p>
                  {(() => {
                    const meta = bookingStatusMeta(booking.status)
                    return (
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider border"
                        style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}>
                        {meta.label}
                      </span>
                    )
                  })()}
                </div>
                <p className="text-2xl font-black tracking-widest text-white mb-4">{booking.bookingCode}</p>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Ghế đã đặt:</span>
                    <span className="font-bold text-red-400">{booking.seats?.map(s => s.seatName).join(', ') || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Tổng tiền:</span>
                    <span className="font-bold text-white">{formatMoney(booking.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-dark-400">Thanh toán:</span>
                    {booking.paymentTime ? (
                      <div className="text-right">
                        <span className="block font-medium text-dark-200">{formatTime(booking.paymentTime)}</span>
                        <span className="text-[10px] text-dark-500">{formatDate(booking.paymentTime)}</span>
                      </div>
                    ) : <span className="font-medium text-dark-500">—</span>}
                  </div>
                  {booking.checkinTime && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-dark-400">Giờ vào rạp:</span>
                      <div className="text-right">
                        <span className="block font-bold text-emerald-400">{formatTime(booking.checkinTime)}</span>
                        <span className="text-[10px] text-dark-500">{formatDate(booking.checkinTime)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-8 bg-dark-900/30">
                {/* Warnings based on status */}
                {booking.status === 'PENDING' && (
                  <div className="text-center p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-medium mb-4">
                    Vé chưa thanh toán
                  </div>
                )}
                {booking.status === 'CANCELLED' && (
                  <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-4">
                    Vé đã bị hủy
                  </div>
                )}
                {booking.status === 'EXPIRED' && (
                  <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-4">
                    Vé đã hết hạn thanh toán
                  </div>
                )}
                {booking.status === 'COMPLETED' && (
                  <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4 flex items-center justify-center gap-2">
                    <TicketCheck className="h-4 w-4" /> Đã soát vé
                  </div>
                )}

                {/* Main Action */}
                {booking.status === 'PAID' && (
                  <Button 
                    onClick={() => setShowConfirm(true)} 
                    className="w-full py-3.5 text-base shadow-glow"
                  >
                    <TicketCheck className="h-5 w-5" />
                    Xác nhận Check-in
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ModalConfirm
        open={showConfirm}
        title="Xác nhận Check-in"
        message={<>Khách hàng <strong>{booking?.customerName}</strong> kiểm tra vé vào phòng <strong>{booking?.roomName}</strong>. Vui lòng xác nhận.</>}
        confirmLabel={processing ? 'Đang xử lý...' : 'Đồng ý check-in'}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleCheckin}
      />
    </div>
  )
}
