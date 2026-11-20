import { useState, useMemo } from 'react'
import { X, Loader2, Eye, Zap } from 'lucide-react'
import Button from '../../components/Button'
import Notification from '../../components/Notification'

const SEAT_TYPES = ['NORMAL', 'VIP', 'COUPLE']

const typeColors = {
  NORMAL: 'border-slate-500/60 bg-slate-500/15 text-slate-300',
  VIP: 'border-amber-500/60 bg-amber-500/15 text-amber-400',
  COUPLE: 'border-pink-500/60 bg-pink-500/15 text-pink-400',
}

export default function BulkSeatModal({ open, existingSeats = [], onSave, onClose }) {
  const [startRow, setStartRow] = useState('A')
  const [endRow, setEndRow] = useState('F')
  const [seatsPerRow, setSeatsPerRow] = useState(10)
  const [seatType, setSeatType] = useState('NORMAL')
  const [showPreview, setShowPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')
  const [creationErrors, setCreationErrors] = useState([])

  const existingSet = useMemo(() => {
    const set = new Set()
    existingSeats.forEach((s) => set.add(`${(s.row || '').toUpperCase()}-${s.number}`))
    return set
  }, [existingSeats])

  const seatsToCreate = useMemo(() => {
    const result = []
    const start = startRow.toUpperCase().charCodeAt(0)
    const end = endRow.toUpperCase().charCodeAt(0)
    if (start < 65 || start > 90 || end < 65 || end > 90 || start > end) return result
    const count = Math.max(1, Math.min(seatsPerRow, 30))
    for (let code = start; code <= end; code++) {
      const row = String.fromCharCode(code)
      for (let num = 1; num <= count; num++) {
        const key = `${row}-${num}`
        if (!existingSet.has(key)) {
          result.push({ row, number: num, type: seatType, active: true })
        }
      }
    }
    return result
  }, [startRow, endRow, seatsPerRow, seatType, existingSet])

  const skippedCount = useMemo(() => {
    const start = startRow.toUpperCase().charCodeAt(0)
    const end = endRow.toUpperCase().charCodeAt(0)
    if (start < 65 || start > 90 || end < 65 || end > 90 || start > end) return 0
    const count = Math.max(1, Math.min(seatsPerRow, 30))
    let skipped = 0
    for (let code = start; code <= end; code++) {
      const row = String.fromCharCode(code)
      for (let num = 1; num <= count; num++) {
        if (existingSet.has(`${row}-${num}`)) skipped++
      }
    }
    return skipped
  }, [startRow, endRow, seatsPerRow, existingSet])

  const validate = () => {
    const s = startRow.trim().toUpperCase()
    const e = endRow.trim().toUpperCase()
    if (!/^[A-Z]$/.test(s)) return 'Hàng bắt đầu phải là 1 ký tự A-Z.'
    if (!/^[A-Z]$/.test(e)) return 'Hàng kết thúc phải là 1 ký tự A-Z.'
    if (s > e) return 'Hàng bắt đầu phải trước hàng kết thúc.'
    if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1) return 'Số ghế mỗi hàng phải ≥ 1.'
    if (seatsToCreate.length === 0) return 'Không có ghế mới nào cần tạo (tất cả đã tồn tại).'
    return null
  }

  const handleCreate = async () => {
    setError('')
    setCreationErrors([])
    const msg = validate()
    if (msg) return setError(msg)
    setCreating(true)
    setProgress({ current: 0, total: seatsToCreate.length })
    try {
      const result = await onSave({
        startRow: startRow.trim().toUpperCase(),
        endRow: endRow.trim().toUpperCase(),
        seatsPerRow,
        type: seatType,
        active: true,
      })
      const created = result?.created ?? seatsToCreate.length
      setProgress({ current: created, total: created })
    } catch (err) {
      setError(err.message || 'Không thể tạo ghế hàng loạt.')
      setProgress({ current: 0, total: 0 })
    } finally {
      setCreating(false)
    }
  }

  const groupedPreview = useMemo(() => {
    const groups = {}
    seatsToCreate.forEach((s) => {
      if (!groups[s.row]) groups[s.row] = []
      groups[s.row].push(s)
    })
    return groups
  }, [seatsToCreate])

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="mx-auto my-6 max-w-2xl space-y-5 rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Tạo ghế hàng loạt
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Notification type="error" message={error} />

        {/* Creation completed */}
        {!creating && progress.current > 0 && progress.current === progress.total && (
          <Notification
            message={`Đã tạo thành công ${progress.current - creationErrors.length}/${progress.total} ghế.`}
          />
        )}

        {/* Creation errors */}
        {creationErrors.length > 0 && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm">
            <p className="font-medium text-red-400 mb-1">Một số ghế không tạo được:</p>
            <ul className="list-disc list-inside text-red-300/80 space-y-0.5 max-h-24 overflow-y-auto">
              {creationErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Form inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-dark-300">
            <span>Hàng bắt đầu <span className="text-red-400">*</span></span>
            <input
              value={startRow}
              onChange={(e) => setStartRow(e.target.value)}
              maxLength={1}
              disabled={creating}
              placeholder="A"
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 uppercase disabled:opacity-40"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-dark-300">
            <span>Hàng kết thúc <span className="text-red-400">*</span></span>
            <input
              value={endRow}
              onChange={(e) => setEndRow(e.target.value)}
              maxLength={1}
              disabled={creating}
              placeholder="F"
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 uppercase disabled:opacity-40"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-dark-300">
            <span>Số ghế mỗi hàng <span className="text-red-400">*</span></span>
            <input
              type="number"
              min="1"
              max="30"
              value={seatsPerRow}
              onChange={(e) => setSeatsPerRow(Number(e.target.value))}
              disabled={creating}
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 disabled:opacity-40"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-dark-300">
            <span>Loại ghế mặc định</span>
            <select
              value={seatType}
              onChange={(e) => setSeatType(e.target.value)}
              disabled={creating}
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 disabled:opacity-40"
            >
              {SEAT_TYPES.map((t) => (
                <option key={t} value={t}>{t === 'NORMAL' ? 'Thường' : t === 'VIP' ? 'VIP' : 'Couple'}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="rounded-xl bg-dark-800/60 border border-dark-700/30 px-4 py-2">
            <span className="text-dark-500">Sẽ tạo: </span>
            <span className="font-semibold text-emerald-400">{seatsToCreate.length} ghế</span>
          </div>
          {skippedCount > 0 && (
            <div className="rounded-xl bg-dark-800/60 border border-dark-700/30 px-4 py-2">
              <span className="text-dark-500">Bỏ qua (đã tồn tại): </span>
              <span className="font-semibold text-amber-400">{skippedCount} ghế</span>
            </div>
          )}
        </div>

        {/* Preview toggle */}
        {seatsToCreate.length > 0 && !creating && (
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-200 transition"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Ẩn bản xem trước' : 'Xem trước sơ đồ ghế'}
          </button>
        )}

        {/* Preview grid */}
        {showPreview && seatsToCreate.length > 0 && (
          <div className="rounded-xl bg-dark-800/40 border border-dark-700/30 p-4 space-y-2 max-h-64 overflow-y-auto">
            {/* Screen indicator */}
            <div className="mx-auto mb-4 text-center">
              <div className="mx-auto h-1 w-2/3 rounded-full bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
              <p className="mt-1 text-[9px] font-medium uppercase tracking-widest text-dark-600">Màn hình</p>
            </div>
            {Object.entries(groupedPreview).map(([row, seats]) => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-6 text-xs font-bold text-dark-400 text-right">{row}</span>
                <div className="flex flex-wrap gap-1">
                  {seats.map((s) => (
                    <div
                      key={`${s.row}${s.number}`}
                      className={`flex items-center justify-center rounded text-[10px] font-semibold transition-all ${
                        s.type === 'COUPLE' ? 'w-12 h-7' : 'w-7 h-7'
                      } ${typeColors[s.type]}`}
                    >
                      {s.row}{s.number}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {creating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                Đang tạo ghế...
              </span>
              <span className="font-semibold text-white">{progress.current}/{progress.total}</span>
            </div>
            <div className="h-2.5 rounded-full bg-dark-700/50 overflow-hidden">
              <div
                className="h-full rounded-full gradient-brand transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={creating}
          >
            {progress.current > 0 && progress.current === progress.total ? 'Đóng' : 'Hủy'}
          </Button>
          {!(progress.current > 0 && progress.current === progress.total) && (
            <Button
              onClick={handleCreate}
              disabled={creating || seatsToCreate.length === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Tạo {seatsToCreate.length} ghế
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
