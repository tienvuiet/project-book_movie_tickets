import { useEffect, useState, useCallback } from 'react'
import { Filter, Search, X } from 'lucide-react'
import bookingService from '../../services/bookingService'
import DataTable from '../../components/DataTable'
import Button from '../../components/Button'
import FormInput from '../../components/FormInput'
import Loading from '../../components/Loading'
import {
  formatDate,
  formatTime,
  formatMoney,
  bookingStatusMeta,
} from '../../utils/formatters'
import useDebounce from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import { Link } from 'react-router-dom'

export default function StaffBookingLookupPage() {
  const { user } = useAuth()
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters state
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, 500)
  
  const [filters, setFilters] = useState({
    date: '',
    status: '',
    page: 0,
    size: 10
  })

  // Mobile filters toggle
  const [showFilters, setShowFilters] = useState(false)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        keyword: debouncedKeyword,
        date: filters.date,
        status: filters.status,
        page: filters.page,
        size: filters.size
      }
      // Remove empty params
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] == null) delete params[k]
      })

      const res = await bookingService.searchStaff(params)
      setData(res.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách vé')
    } finally {
      setLoading(false)
    }
  }, [debouncedKeyword, filters])

  useEffect(() => {
    // Fetching remote data is the synchronization performed by this effect.

    fetchBookings()
  }, [fetchBookings])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value, page: 0 }))
  }

  const columns = [
    {
      key: 'bookingCode',
      title: 'Mã vé',
      render: (r) => <span className="font-bold text-white">{r.bookingCode}</span>
    },
    {
      key: 'customer',
      title: 'Khách hàng',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.customerName || '—'}</p>
          <p className="text-xs text-dark-400">{r.customerPhone || r.customerEmail || '—'}</p>
        </div>
      )
    },
    {
      key: 'movie',
      title: 'Phim & Lịch chiếu',
      render: (r) => (
        <div>
          <p className="font-medium text-white truncate max-w-[200px]">{r.movieTitle}</p>
          <p className="text-xs text-dark-400">
            {formatTime(r.showtimeStartTime)} - {formatDate(r.showtimeStartTime)} • Ph. {r.roomName}
          </p>
        </div>
      )
    },
    {
      key: 'seats',
      title: 'Ghế',
      render: (r) => <span className="text-sm">{r.seats?.map(s => s.seatName).join(', ')}</span>
    },
    {
      key: 'totalPrice',
      title: 'Tổng tiền',
      render: (r) => <span className="font-medium text-red-400">{formatMoney(r.totalPrice)}</span>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (r) => {
        const meta = bookingStatusMeta(r.status)
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider border whitespace-nowrap"
            style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}>
            {meta.label}
          </span>
        )
      }
    },
    {
      key: 'actions',
      title: '',
      render: (r) => (
        <div className="flex justify-end">
          {r.status === 'PAID' && (
            <Link to="/staff/checkin" state={{ code: r.bookingCode }} className="mr-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 px-3 py-1.5 rounded-lg transition-colors">
              Check-in
            </Link>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Tra cứu vé</h1>
        <p className="text-sm font-medium text-dark-400 bg-dark-800/60 px-4 py-2 rounded-xl border border-dark-700">
          Rạp: <span className="text-white">{user?.cinemaName || 'Tất cả'}</span>
        </p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl glass p-4">
        <div className="flex items-center gap-3 mb-4 sm:hidden">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full">
            <Filter className="h-4 w-4" />
            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </Button>
        </div>

        <div className={`grid gap-4 ${showFilters ? 'grid-cols-1' : 'hidden'} sm:grid sm:grid-cols-2 lg:grid-cols-4`}>
          <div className="relative">
            <FormInput
              placeholder="Tìm mã vé, tên khách, sđt..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500 pointer-events-none" />
          </div>

          <FormInput
            type="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
          />

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full rounded-xl border bg-dark-800/60 px-3.5 py-2.5 text-white outline-none transition-all border-dark-700/50 hover:border-dark-600/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PAID">Đã thanh toán (Sẵn sàng check-in)</option>
            <option value="COMPLETED">Đã check-in</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          <Button variant="ghost" onClick={() => {
            setKeyword('')
            setFilters({ date: '', status: '', page: 0, size: 10 })
          }} className="justify-center">
            <X className="h-4 w-4" />
            Xóa bộ lọc
          </Button>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-sm text-red-400">{error}</div>}

      {/* Data presentation */}
      {loading && !data.content.length ? (
        <Loading label="Đang tải danh sách vé..." />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="grid gap-4 sm:hidden">
            {data.content.length ? data.content.map(booking => {
              const meta = bookingStatusMeta(booking.status)
              return (
                <div key={booking.id} className="rounded-xl glass p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white text-lg">{booking.bookingCode}</p>
                      <p className="text-sm text-dark-300">{booking.customerName}</p>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase" style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="bg-dark-800/40 rounded-lg p-3 text-sm space-y-1.5 border border-dark-700/50">
                    <p className="text-white font-medium line-clamp-1">{booking.movieTitle}</p>
                    <p className="text-dark-400 text-xs">
                      {formatTime(booking.showtimeStartTime)} - {formatDate(booking.showtimeStartTime)} • Ph.{booking.roomName}
                    </p>
                    <div className="flex justify-between mt-2 pt-2 border-t border-dark-700/50">
                      <span className="text-dark-400 text-xs">Ghế: {booking.seats?.map(s => s.seatName).join(', ')}</span>
                      <span className="font-semibold text-red-400">{formatMoney(booking.totalPrice)}</span>
                    </div>
                  </div>
                  {booking.status === 'PAID' && (
                    <Link to="/staff/checkin" state={{ code: booking.bookingCode }}>
                      <Button className="w-full mt-2 text-sm py-2">
                        Kiểm vé ngay
                      </Button>
                    </Link>
                  )}
                </div>
              )
            }) : (
              <div className="rounded-2xl glass p-8 text-center text-dark-500">
                Không tìm thấy vé nào phù hợp
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              rows={data.content}
              page={filters.page}
              totalPages={data.totalPages}
              onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
              emptyText="Không tìm thấy vé nào phù hợp với bộ lọc."
            />
          </div>
        </>
      )}
    </div>
  )
}
