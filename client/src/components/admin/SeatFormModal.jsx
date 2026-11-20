import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import Button from '../../components/Button'
import Notification from '../../components/Notification'

const SEAT_TYPES = ['NORMAL', 'VIP', 'COUPLE']

const emptyForm = { row: '', number: '', type: 'NORMAL', active: true }

export default function SeatFormModal({ open, seat, existingSeats = [], onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (seat) return { row: seat.row || '', number: seat.number ?? '', type: seat.type || 'NORMAL', active: seat.active !== false }
    return { ...emptyForm }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(seat
      ? {
          row: seat.row || '',
          number: seat.number ?? '',
          type: seat.type || 'NORMAL',
          active: seat.active !== false,
        }
      : { ...emptyForm })
    setError('')
    setSaving(false)
  }, [open, seat])

  if (!open) return null

  const isEditing = Boolean(seat)

  const change = (e) => {
    const { name, value, type: inputType, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: inputType === 'checkbox' ? checked : value }))
  }

  const validate = () => {
    if (!form.row.trim()) return 'Vui lòng nhập hàng ghế.'
    if (!/^[A-Z]$/i.test(form.row.trim())) return 'Hàng ghế phải là 1 ký tự chữ cái (A-Z).'
    const num = Number(form.number)
    if (!Number.isInteger(num) || num < 1) return 'Số ghế phải là số nguyên dương.'
    const rowUp = form.row.trim().toUpperCase()
    const duplicate = existingSeats.find(
      (s) => s.row?.toUpperCase() === rowUp && Number(s.number) === num && (!isEditing || s.id !== seat.id)
    )
    if (duplicate) return `Ghế ${rowUp}${num} đã tồn tại trong phòng này.`
    return null
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const msg = validate()
    if (msg) return setError(msg)
    const payload = {
      row: form.row.trim().toUpperCase(),
      number: Number(form.number),
      type: form.type,
      active: form.active,
    }
    try {
      setSaving(true)
      await onSave(payload)
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? `Sửa ghế ${seat.row}${seat.number}` : 'Thêm ghế'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Notification type="error" message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Row */}
          <label className="space-y-1.5 text-sm font-medium text-dark-300">
            <span>Hàng ghế <span className="text-red-400">*</span></span>
            <input
              name="row"
              value={form.row}
              onChange={change}
              placeholder="A"
              maxLength={1}
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 uppercase"
            />
          </label>

          {/* Number */}
          <label className="space-y-1.5 text-sm font-medium text-dark-300">
            <span>Số ghế <span className="text-red-400">*</span></span>
            <input
              name="number"
              type="number"
              min="1"
              value={form.number}
              onChange={change}
              placeholder="1"
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            />
          </label>

          {/* Type */}
          <label className="space-y-1.5 text-sm font-medium text-dark-300">
            <span>Loại ghế</span>
            <select
              name="type"
              value={form.type}
              onChange={change}
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            >
              {SEAT_TYPES.map((t) => (
                <option key={t} value={t}>{t === 'NORMAL' ? 'Thường' : t === 'VIP' ? 'VIP' : 'Couple'}</option>
              ))}
            </select>
          </label>

          {/* Active */}
          <label className="flex items-center gap-3 text-sm font-medium text-dark-300 pt-7">
            <div className="relative">
              <input
                name="active"
                type="checkbox"
                checked={form.active}
                onChange={change}
                className="sr-only peer"
              />
              <div className="h-6 w-11 rounded-full bg-dark-700 peer-checked:bg-emerald-500/60 transition-colors cursor-pointer" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-dark-300 peer-checked:translate-x-5 peer-checked:bg-white transition-transform cursor-pointer" />
            </div>
            <span>{form.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>
          </label>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center py-3">
          <div className="text-center">
            <span className="text-xs text-dark-500 uppercase tracking-wider">Xem trước</span>
            <div className="mt-2 flex justify-center">
              <div
                className={`flex items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                  form.type === 'COUPLE' ? 'w-20 h-10' : 'w-10 h-10'
                } ${
                  !form.active
                    ? 'border-dark-700/30 bg-dark-700/50 text-dark-600 opacity-50 line-through'
                    : form.type === 'VIP'
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-400'
                      : form.type === 'COUPLE'
                        ? 'border-pink-500/60 bg-pink-500/15 text-pink-400'
                        : 'border-slate-500/60 bg-slate-500/15 text-slate-300'
                }`}
              >
                {(form.row || '?').toUpperCase()}{form.number || '?'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              isEditing ? 'Cập nhật' : 'Thêm ghế'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
