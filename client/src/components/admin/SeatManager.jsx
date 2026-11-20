import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Zap, List, LayoutGrid, Edit3, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import ModalConfirm from '../../components/ModalConfirm'
import SeatFormModal from './SeatFormModal'
import BulkSeatModal from './BulkSeatModal'
import cinemaService from '../../services/cinemaService'

const unwrap = (response) => {
  const data = response?.data ?? response
  if (!Array.isArray(data)) throw new Error('Backend quản lý ghế chưa trả về danh sách hợp lệ.')
  return data
}

const seatTypeLabel = { NORMAL: 'Thường', VIP: 'VIP', COUPLE: 'Couple' }

const seatTypeStyle = {
  NORMAL: 'border-slate-500/60 bg-slate-600/20 text-slate-300 hover:bg-slate-600/30',
  VIP: 'border-amber-500/60 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25',
  COUPLE: 'border-pink-500/60 bg-pink-500/15 text-pink-400 hover:bg-pink-500/25',
}

const seatTypeBadge = {
  NORMAL: 'bg-slate-500/10 text-slate-400',
  VIP: 'bg-amber-500/10 text-amber-400',
  COUPLE: 'bg-pink-500/10 text-pink-400',
}

export default function SeatManager({ cinema, room, onBack, canDelete = true }) {
  const [seats, setSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState('map')
  const [seatModal, setSeatModal] = useState({ open: false, seat: null })
  const [bulkModal, setBulkModal] = useState(false)
  const [deleteSeat, setDeleteSeat] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadSeats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await cinemaService.getSeats(room.id)
      setSeats(unwrap(res))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [room.id])

  useEffect(() => { loadSeats() }, [loadSeats])

  /* Group seats by row for seat map */
  const seatMap = useMemo(() => {
    const groups = {}
    seats.forEach((s) => {
      const row = (s.row || '?').toUpperCase()
      if (!groups[row]) groups[row] = []
      groups[row].push(s)
    })
    Object.keys(groups).forEach((row) => {
      groups[row].sort((a, b) => (a.number || 0) - (b.number || 0))
    })
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
    return sortedEntries
  }, [seats])

  /* CRUD handlers */
  const handleSaveSeat = async (payload) => {
    setError('')
    setSuccess('')
    if (seatModal.seat) {
      await cinemaService.updateSeat(room.id, seatModal.seat.id, payload)
      setSeatModal({ open: false, seat: null })
      setSuccess(`Cập nhật ghế ${payload.row}${payload.number} thành công.`)
    } else {
      await cinemaService.createSeat(room.id, payload)
      setSeatModal({ open: false, seat: null })
      setSuccess(`Thêm ghế ${payload.row}${payload.number} thành công.`)
    }
    await loadSeats()
  }

  const handleBulkCreate = async (payload) => {
    const result = await cinemaService.createSeatsBulk(room.id, payload)
    await loadSeats()
    setSuccess(`Đã tạo ${result?.data?.created ?? result?.created ?? 0} ghế, bỏ qua ${result?.data?.skipped ?? result?.skipped ?? 0} ghế đã tồn tại.`)
    return result?.data ?? result
  }

  const handleBulkClose = () => {
    setBulkModal(false)
    loadSeats()
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      setError('')
      setSuccess('')
      await cinemaService.removeSeat(room.id, deleteSeat.id)
      setDeleteSeat(null)
      setSuccess(`Đã xóa ghế ${deleteSeat.row}${deleteSeat.number}.`)
      await loadSeats()
    } catch (e) {
      setError(e.message)
      setDeleteSeat(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-dark-400 hover:text-white transition rounded-lg px-2 py-1 hover:bg-dark-800/60"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{cinema.name}</span>
        </button>
        <span className="text-dark-600">/</span>
        <span className="text-dark-300 font-medium">{room.name}</span>
        <span className="text-dark-600">/</span>
        <span className="text-white font-semibold">Ghế ngồi</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Quản lý ghế — {room.name}</h2>
          <p className="text-sm text-dark-400 mt-0.5">{cinema.name} • {seats.length} ghế</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl border border-dark-700/50 overflow-hidden">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                viewMode === 'map' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Sơ đồ
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                viewMode === 'list' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Danh sách
            </button>
          </div>
          <Button variant="outline" onClick={() => setBulkModal(true)}>
            <Zap className="h-4 w-4" /> Tạo hàng loạt
          </Button>
          <Button onClick={() => setSeatModal({ open: true, seat: null })}>
            <Plus className="h-4 w-4" /> Thêm ghế
          </Button>
        </div>
      </div>

      <Notification type="error" message={error} />
      <Notification message={success} />

      {/* Content */}
      {loading ? (
        <Loading label="Đang tải ghế..." />
      ) : seats.length === 0 ? (
        <div className="rounded-2xl glass p-12 text-center animate-fade-in">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-dark-800/60 flex items-center justify-center mb-4">
            <LayoutGrid className="h-8 w-8 text-dark-600" />
          </div>
          <h3 className="text-lg font-semibold text-dark-300 mb-1">Chưa có ghế nào</h3>
          <p className="text-sm text-dark-500 mb-5">Bắt đầu bằng cách thêm ghế hoặc tạo hàng loạt.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setBulkModal(true)}>
              <Zap className="h-4 w-4" /> Tạo hàng loạt
            </Button>
            <Button onClick={() => setSeatModal({ open: true, seat: null })}>
              <Plus className="h-4 w-4" /> Thêm ghế
            </Button>
          </div>
        </div>
      ) : viewMode === 'map' ? (
        /* =================== SEAT MAP VIEW =================== */
        <div className="rounded-2xl glass p-5 animate-fade-in space-y-4">
          {/* Screen */}
          <div className="mx-auto mb-6 text-center">
            <div className="mx-auto h-1.5 w-2/3 rounded-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
            <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-dark-600">Màn hình chiếu</p>
          </div>

          {/* Rows */}
          <div className="flex flex-col items-center space-y-2 overflow-x-auto">
            {seatMap.map(([rowLabel, rowSeats]) => (
              <div key={rowLabel} className="flex items-center gap-2 min-w-fit">
                <span className="w-7 text-right text-xs font-bold text-dark-400 shrink-0">{rowLabel}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {rowSeats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => setSeatModal({ open: true, seat })}
                      title={`${seat.row}${seat.number} — ${seatTypeLabel[seat.type] || seat.type}${!seat.active ? ' (Ngừng)' : ''}`}
                      className={`flex items-center justify-center rounded-lg border-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                        seat.type === 'COUPLE' ? 'w-16 h-9 sm:w-20 sm:h-10' : 'w-9 h-9 sm:w-10 sm:h-10'
                      } ${
                        seat.active === false
                          ? 'border-dark-700/30 bg-dark-700/50 text-dark-600 opacity-40 line-through'
                          : seatTypeStyle[seat.type] || seatTypeStyle.NORMAL
                      } hover:scale-95 hover:shadow-glow-sm`}
                    >
                      {seat.row}{seat.number}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-dark-700/30 flex flex-wrap gap-4 text-xs text-dark-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-5 w-5 rounded border-2 border-slate-500/60 bg-slate-600/20" />
              Thường
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-5 w-5 rounded border-2 border-amber-500/60 bg-amber-500/15" />
              VIP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-5 w-8 rounded border-2 border-pink-500/60 bg-pink-500/15" />
              Couple
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-5 w-5 rounded border-2 border-dark-700/30 bg-dark-700/50 opacity-40 line-through text-center text-[8px] text-dark-600">X</span>
              Ngừng
            </span>
            <span className="ml-auto text-dark-500 italic">Click vào ghế để sửa</span>
          </div>
        </div>
      ) : (
        /* =================== LIST VIEW =================== */
        <DataTable
          rows={seats}
          emptyText="Chưa có ghế nào"
          columns={[
            {
              key: 'code',
              title: 'Mã ghế',
              render: (row) => (
                <span className="font-semibold text-white">{row.row}{row.number}</span>
              ),
            },
            { key: 'row', title: 'Hàng' },
            { key: 'number', title: 'Số' },
            {
              key: 'type',
              title: 'Loại',
              render: (row) => (
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${seatTypeBadge[row.type] || seatTypeBadge.NORMAL}`}>
                  {seatTypeLabel[row.type] || row.type}
                </span>
              ),
            },
            {
              key: 'active',
              title: 'Trạng thái',
              render: (row) => (
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  row.active !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dark-700/50 text-dark-400'
                }`}>
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${row.active !== false ? 'bg-emerald-400' : 'bg-dark-500'}`} />
                  {row.active !== false ? 'Hoạt động' : 'Ngừng'}
                </span>
              ),
            },
            {
              key: 'actions',
              title: '',
              render: (row) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => setSeatModal({ open: true, seat: row })}
                    className="rounded-lg p-2 text-dark-400 hover:bg-blue-500/10 hover:text-blue-400 transition"
                    title="Sửa"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {canDelete && <button
                    onClick={() => setDeleteSeat(row)}
                    className="rounded-lg p-2 text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Seat Form Modal */}
      <SeatFormModal
        open={seatModal.open}
        seat={seatModal.seat}
        existingSeats={seats}
        onSave={handleSaveSeat}
        onClose={() => setSeatModal({ open: false, seat: null })}
      />

      {/* Bulk Seat Modal */}
      <BulkSeatModal
        open={bulkModal}
        existingSeats={seats}
        onSave={handleBulkCreate}
        onClose={handleBulkClose}
      />

      {/* Delete Confirm */}
      <ModalConfirm
        open={Boolean(deleteSeat)}
        title="Xóa ghế"
        message={`Bạn có chắc muốn xóa ghế ${deleteSeat?.row || ''}${deleteSeat?.number || ''}? Thao tác này không thể hoàn tác.`}
        onCancel={() => setDeleteSeat(null)}
        onConfirm={handleDelete}
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa'}
      />
    </div>
  )
}
