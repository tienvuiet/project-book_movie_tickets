import { Eye, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import ModalConfirm from '../../components/ModalConfirm'
import bookingService from '../../services/bookingService'

const STATUS_LABELS = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn', COMPLETED: 'Đã check-in' }
const STATUS_COLORS = { PENDING: 'bg-amber-500/10 text-amber-400', PAID: 'bg-emerald-500/10 text-emerald-400', CANCELLED: 'bg-red-500/10 text-red-400', EXPIRED: 'bg-dark-700/50 text-dark-400', COMPLETED: 'bg-blue-500/10 text-blue-400' }
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)
const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '--'

export default function BookingManagementPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { setLoading(true); const response = await bookingService.getAll(); setRows(response?.data || response || []) }
    catch (loadError) { toast.error(loadError.message || 'Không thể tải danh sách vé.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => rows.filter((booking) => {
    const text = `${booking.bookingCode} ${booking.customerName} ${booking.customerEmail} ${booking.movieTitle} ${booking.cinemaName}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (!status || booking.status === status)
  }), [rows, query, status])

  const cancelBooking = async () => {
    try {
      const response = await bookingService.adminCancel(cancelTarget.id)
      const updated = response?.data || response
      setRows((items) => items.map((item) => item.id === updated.id ? updated : item))
      setCancelTarget(null)
      toast.success('Hủy vé thành công.')
    } catch (cancelError) { toast.error(cancelError.message || 'Không thể hủy vé.'); setCancelTarget(null) }
  }

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold text-white">Quản lý vé</h1><p className="mt-1 text-sm text-dark-400">Theo dõi và xử lý tất cả giao dịch đặt vé.</p></div>
    <div className="flex flex-wrap gap-3 rounded-2xl glass p-4">
      <label className="relative min-w-64 flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500"/><input className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none" placeholder="Mã vé, khách hàng, phim, rạp..." value={query} onChange={(e) => setQuery(e.target.value)}/></label>
      <select className="rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-sm text-white outline-none" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </div>
    <DataTable emptyText={loading ? 'Đang tải danh sách vé...' : 'Không tìm thấy vé nào.'} rows={filtered} columns={[
      { key: 'bookingCode', title: 'Mã vé', render: (b) => <span className="font-semibold text-white">{b.bookingCode}</span> },
      { key: 'customer', title: 'Khách hàng', render: (b) => <div><p className="text-white">{b.customerName}</p><p className="text-xs text-dark-500">{b.customerEmail}</p></div> },
      { key: 'movie', title: 'Phim / Suất chiếu', render: (b) => <div><p>{b.movieTitle}</p><p className="text-xs text-dark-500">{dateTime(b.startTime)}</p></div> },
      { key: 'seats', title: 'Ghế', render: (b) => b.seats?.map((s) => `${s.row}${s.number}`).join(', ') || '--' },
      { key: 'totalAmount', title: 'Tổng tiền', render: (b) => (
        <div>
          <div className="font-semibold text-white">{money(b.totalAmount)}</div>
          {Number(b.discountAmount || 0) > 0 && (
            <div className="text-xs text-emerald-400">-{money(b.discountAmount)}</div>
          )}
        </div>
      ) },
      { key: 'voucher', title: 'Voucher', render: (b) => b.promoCode ? (
        <div>
          <span className="font-mono text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">{b.promoCode}</span>
          {Number(b.discountAmount || 0) > 0 && (
            <div className="text-xs text-emerald-400 mt-1">-{money(b.discountAmount)}</div>
          )}
        </div>
      ) : <span className="text-dark-600">—</span> },
      { key: 'status', title: 'Trạng thái', render: (b) => <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[b.status] || ''}`}>{STATUS_LABELS[b.status] || b.status}</span> },
      { key: 'actions', title: '', render: (b) => <div className="flex gap-2"><button className="rounded-lg p-2 text-dark-400 hover:bg-blue-500/10 hover:text-blue-400" title="Chi tiết" onClick={() => setSelected(b)}><Eye className="h-4 w-4"/></button>{['PENDING', 'PAID'].includes(b.status) && <Button variant="outline" onClick={() => setCancelTarget(b)}>Hủy vé</Button>}</div> },
    ]}/>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-2xl glass-strong p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-white">Chi tiết vé {selected.bookingCode}</h2><button onClick={() => setSelected(null)} className="p-2 text-dark-400 hover:text-white"><X className="h-5 w-5"/></button></div><div className="grid gap-4 text-sm sm:grid-cols-2"><Detail label="Khách hàng" value={`${selected.customerName} (${selected.customerEmail})`}/><Detail label="Phim" value={selected.movieTitle}/><Detail label="Rạp / Phòng" value={`${selected.cinemaName} / ${selected.roomName}`}/><Detail label="Suất chiếu" value={dateTime(selected.startTime)}/><Detail label="Ghế" value={selected.seats?.map((s) => `${s.row}${s.number} (${s.type})`).join(', ')}/><Detail label="Tổng tiền" value={money(selected.totalAmount)}/><Detail label="Mã giảm giá" value={selected.promoCode || '—'}/>{Number(selected.discountAmount || 0) > 0 && <Detail label="Số tiền được giảm" value={`-${money(selected.discountAmount)}`}/>}<Detail label="Thời gian đặt" value={dateTime(selected.createdAt)}/><Detail label="Check-in" value={dateTime(selected.checkedInAt)}/></div></div></div>}
    <ModalConfirm open={Boolean(cancelTarget)} message={`Bạn có chắc muốn hủy vé ${cancelTarget?.bookingCode || ''}? Vé sẽ được lưu lại với trạng thái Đã hủy.`} onCancel={() => setCancelTarget(null)} onConfirm={cancelBooking} confirmLabel="Hủy vé"/>
  </section>
}

function Detail({ label, value }) { return <div className="rounded-xl bg-dark-800/50 p-3"><p className="text-xs text-dark-500">{label}</p><p className="mt-1 text-white">{value || '--'}</p></div> }
