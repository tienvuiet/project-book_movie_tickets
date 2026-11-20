import { Clock, MapPin, Search, Star, ChevronLeft, ChevronRight, Tag, Ticket } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import bookingService from '../../services/bookingService'

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('ALL')
  const [page, setPage] = useState(1)
  const perPage = 8

  useEffect(() => {
    bookingService
      .getMine()
      .then((res) => {
        setRows(res.data || res || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const isPast = new Date(r.startTime) < new Date()
      if (tab === 'UPCOMING') return (r.status === 'PAID' || r.status === 'PENDING') && !isPast
      if (tab === 'PAST') return r.status === 'COMPLETED' || isPast
      if (tab === 'CANCELLED') return r.status === 'CANCELLED' || r.status === 'EXPIRED'
      return true
    })
  }, [rows, tab])

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / perPage)

  // Tabs counts
  const counts = useMemo(() => {
    const upcoming = rows.filter(r => (r.status === 'PAID' || r.status === 'PENDING') && new Date(r.startTime) >= new Date()).length
    const past = rows.filter(r => r.status === 'COMPLETED' || new Date(r.startTime) < new Date()).length
    const cancelled = rows.filter(r => r.status === 'CANCELLED' || r.status === 'EXPIRED').length
    return { ALL: rows.length, UPCOMING: upcoming, PAST: past, CANCELLED: cancelled }
  }, [rows])

  if (loading) return <Loading label="Đang tải lịch sử đặt vé..." />

  return (
    <div className="bg-dark-950 text-dark-200 min-h-screen">
      <section className="mx-auto max-w-7xl px-4 py-10 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Lịch sử đặt vé</h1>
            <p className="text-dark-400 text-sm max-w-md">
              Quản lý và theo dõi tất cả các giao dịch đặt vé của bạn. Xem chi tiết thông tin suất chiếu và mã QR nhận vé.
            </p>
          </div>
          <div className="shrink-0">
            <button className="flex items-center gap-2 rounded-lg bg-dark-800/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-dark-700">
              <Ticket className="h-4 w-4" />
              Tất cả thời gian
            </button>
          </div>
        </div>

        <Notification type="error" message={error} className="mb-6" />

        {/* Tabs */}
        <div className="flex gap-6 border-b border-dark-800 mb-8 overflow-x-auto scrollbar-hide">
          {[
            { id: 'ALL', label: 'Tất cả', count: counts.ALL },
            { id: 'UPCOMING', label: 'Sắp tới', count: counts.UPCOMING },
            { id: 'PAST', label: 'Đã đi', count: counts.PAST },
            { id: 'CANCELLED', label: 'Đã hủy', count: counts.CANCELLED },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1) }}
              className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-all ${
                tab === t.id 
                ? 'border-red-500 text-red-500' 
                : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                tab === t.id ? 'bg-red-500/10 text-red-500' : 'bg-dark-800 text-dark-400'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {paginated.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
            {paginated.map((booking) => {
              const startDt = new Date(booking.startTime)
              const timeStr = startDt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              const dateStr = startDt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
              const isPast = startDt < new Date()
              
              let statusProps = { text: 'KHÔNG RÕ', color: 'text-dark-500', bg: 'bg-dark-800' }
              let actionBtn = null

              if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
                statusProps = { text: 'ĐÃ HỦY', color: 'text-red-400', bg: 'bg-red-500/10' }
                actionBtn = <Button variant="outline" className="w-full pointer-events-none opacity-50 bg-transparent">Đã hủy</Button>
              } else if (booking.status === 'PENDING') {
                statusProps = { text: 'CHỜ THANH TOÁN', color: 'text-amber-400', bg: 'bg-amber-500/10' }
                if (!isPast) {
                  actionBtn = <Button className="w-full bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold" onClick={() => navigate(`/payment/${booking.id}`)}>Thanh toán ngay</Button>
                } else {
                  actionBtn = <Button variant="outline" className="w-full pointer-events-none opacity-50">Đã quá hạn</Button>
                }
              } else if (booking.status === 'PAID' || booking.status === 'COMPLETED') {
                if (isPast || booking.status === 'COMPLETED') {
                  statusProps = { text: 'ĐÃ KẾT THÚC', color: 'text-dark-300', bg: 'bg-dark-800/80' }
                  actionBtn = <Button variant="outline" className="w-full bg-dark-800 border-dark-700 hover:bg-dark-700">Đặt lại</Button>
                } else {
                  statusProps = { text: 'ĐÃ THANH TOÁN', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                  actionBtn = <Button className="w-full bg-red-600 hover:bg-red-500 font-bold text-white" onClick={() => navigate(`/success/${booking.id}`)}>Xem chi tiết</Button>
                }
              }

              return (
                <div key={booking.id} className="group rounded-2xl bg-[#16181f] border border-[#232630] overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-glass-lg">
                  {/* Image half */}
                  <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden">
                    <img 
                      src={booking.moviePosterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba'} 
                      alt={booking.movieTitle} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16181f] via-[#16181f]/40 to-transparent" />
                    
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-bold text-amber-400 backdrop-blur-md">
                      <Star className="h-3 w-3 fill-amber-400" /> 8.5
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white truncate drop-shadow-md">{booking.movieTitle}</h3>
                      <p className="text-xs text-dark-300 mt-1 truncate drop-shadow-md">
                        Hành động, Viễn tưởng
                      </p>
                    </div>
                  </div>

                  {/* Details half */}
                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-mono font-bold text-dark-500 uppercase">
                        {booking.bookingCode}
                      </span>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide ${statusProps.bg} ${statusProps.color}`}>
                        {statusProps.text}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-dark-300 mb-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-dark-500 shrink-0" />
                        <span className="font-medium">{timeStr} • {dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-dark-500 shrink-0" />
                        <span className="truncate">{booking.cinemaName} - {booking.roomName}</span>
                      </div>
                      {booking.promoCode && (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Tag className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span className="font-mono text-[11px] font-bold text-red-400 truncate">{booking.promoCode}</span>
                          </div>
                          {Number(booking.discountAmount || 0) > 0 && (
                            <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                              -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(booking.discountAmount)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                      {actionBtn}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <Ticket className="h-16 w-16 text-dark-700 mb-4" />
            <h3 className="text-lg font-bold text-white">Chưa có vé nào</h3>
            <p className="text-dark-500 text-sm mt-1">Bạn chưa có giao dịch nào trong mục này.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 border-t border-dark-800/50 pt-8">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-700 bg-dark-800/50 text-dark-400 hover:bg-dark-700 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                    page === i + 1
                    ? 'bg-red-500 text-white'
                    : 'border border-dark-700 bg-dark-800/50 text-dark-400 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-700 bg-dark-800/50 text-dark-400 hover:bg-dark-700 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-dark-500">
              Hiển thị {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} trong tổng số {filtered.length} đơn hàng
            </p>
          </div>
        )}

      </section>
    </div>
  )
}
