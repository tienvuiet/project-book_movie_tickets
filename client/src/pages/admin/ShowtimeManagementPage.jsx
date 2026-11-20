import { Edit3, Filter, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import ModalConfirm from '../../components/ModalConfirm'
import Loading from '../../components/Loading'
import showtimeService from '../../services/showtimeService'
import movieService from '../../services/movieService'
import cinemaService from '../../services/cinemaService'
import { formatCurrency } from '../../utils/formatters'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'

const unwrap = (r) => r?.data ?? r ?? []
const STATUSES = ['SCHEDULED', 'ONGOING', 'FINISHED', 'CANCELLED']
const EDITABLE_STATUSES = ['SCHEDULED', 'CANCELLED']
const STATUS_LABELS = { SCHEDULED: 'Sắp chiếu', ONGOING: 'Đang chiếu', FINISHED: 'Đã kết thúc', CANCELLED: 'Đã hủy' }
const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-500/10 text-blue-400',
  ONGOING: 'bg-emerald-500/10 text-emerald-400',
  FINISHED: 'bg-dark-700/50 text-dark-400',
  CANCELLED: 'bg-red-500/10 text-red-400',
}
const STATUS_DOTS = {
  SCHEDULED: 'bg-blue-400',
  ONGOING: 'bg-emerald-400',
  FINISHED: 'bg-dark-500',
  CANCELLED: 'bg-red-400',
}

const emptyForm = { movieId: '', cinemaId: '', roomId: '', date: '', time: '', basePrice: '', status: 'SCHEDULED' }

const localDateTimeValue = (date) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export default function ShowtimeManagementPage() {
  const { user, roles } = useAuth()
  const isAdmin = roles.includes(ROLES.ADMIN)
  const [showtimes, setShowtimes] = useState([])
  const [movies, setMovies] = useState([])
  const [cinemas, setCinemas] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterDate, setFilterDate] = useState('')
  const [filterMovie, setFilterMovie] = useState('')
  const [filterCinema, setFilterCinema] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [query, setQuery] = useState('')

  // Form
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formRooms, setFormRooms] = useState([])
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Selected movie duration for auto end time
  const selectedMovie = useMemo(() => movies.find((m) => m.id === Number(form.movieId)), [movies, form.movieId])

  const load = async () => {
    try {
      setLoading(true)
      const [stRes, mRes, cRes] = await Promise.all([isAdmin ? showtimeService.getAll() : showtimeService.getStaffAll(), movieService.getAll(), cinemaService.getAll()])
      const allCinemas = unwrap(cRes)
      setShowtimes(unwrap(stRes))
      setMovies(unwrap(mRes))
      setCinemas(isAdmin ? allCinemas : allCinemas.filter((cinema) => cinema.id === Number(user?.cinemaId)))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load rooms when cinema changes in form
  useEffect(() => {
    if (!form.cinemaId) {
      setFormRooms([])
      return
    }
    let cancelled = false
    cinemaService.getRooms(form.cinemaId)
      .then((r) => { if (!cancelled) setFormRooms(unwrap(r)) })
      .catch(() => { if (!cancelled) setFormRooms([]) })
    return () => { cancelled = true }
  }, [form.cinemaId])

  // Auto-compute endTime
  const computedEndTime = useMemo(() => {
    if (!form.date || !form.time || !selectedMovie?.durationMinutes) return ''
    try {
      const start = new Date(`${form.date}T${form.time}`)
      const end = new Date(start.getTime() + (selectedMovie.durationMinutes + 15) * 60000)
      return localDateTimeValue(end).slice(0, 16).replace('T', ' ')
    } catch { return '' }
  }, [form.date, form.time, selectedMovie])

  // Filtered rows
  const filtered = useMemo(() => {
    return showtimes.filter((s) => {
      if (filterDate && !s.startTime?.startsWith(filterDate)) return false
      if (filterMovie && s.movieId !== Number(filterMovie)) return false
      if (filterCinema && s.cinemaId !== Number(filterCinema)) return false
      if (filterStatus && s.status !== filterStatus) return false
      if (query) {
        const q = query.toLowerCase()
        const searchable = `${s.movieTitle} ${s.cinemaName} ${s.roomName}`.toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [showtimes, filterDate, filterMovie, filterCinema, filterStatus, query])

  const change = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Reset room when cinema changes
      if (name === 'cinemaId') next.roomId = ''
      return next
    })
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const close = () => { setOpen(false); setEditing(null); setForm(emptyForm); setFormErrors({}) }

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setFormErrors({}); setOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    const startDt = row.startTime ? new Date(row.startTime) : null
    setForm({
      movieId: String(row.movieId || ''),
      cinemaId: String(row.cinemaId || ''),
      roomId: String(row.roomId || ''),
      date: startDt ? localDateTimeValue(startDt).slice(0, 10) : '',
      time: startDt ? startDt.toTimeString().slice(0, 5) : '',
      basePrice: row.basePrice ?? '',
      status: row.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
    })
    setFormErrors({})
    setOpen(true)
  }

  const validate = () => {
    const errs = {}
    if (!form.movieId) errs.movieId = 'Vui lòng chọn phim'
    if (!form.cinemaId) errs.cinemaId = 'Vui lòng chọn rạp'
    if (!form.roomId) errs.roomId = 'Vui lòng chọn phòng chiếu'
    if (!form.date) errs.date = 'Vui lòng chọn ngày chiếu'
    if (!form.time) errs.time = 'Vui lòng chọn giờ bắt đầu'
    if (!form.basePrice || Number(form.basePrice) <= 0) errs.basePrice = 'Giá vé phải lớn hơn 0'
    if (form.date && form.time) {
      const start = new Date(`${form.date}T${form.time}`)
      if (start <= new Date()) errs.time = 'Thời gian bắt đầu phải nằm trong tương lai'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    const startTime = `${form.date}T${form.time}:00`
    const duration = selectedMovie?.durationMinutes || 120
    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + (duration + 15) * 60000)
    const endTime = localDateTimeValue(endDate)

    const payload = {
      movieId: Number(form.movieId),
      roomId: Number(form.roomId),
      startTime,
      endTime,
      basePrice: Number(form.basePrice),
      status: form.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
    }

    try {
      setSaving(true)
      if (editing) {
        await showtimeService.update(editing.id, payload)
        toast.success('Cập nhật suất chiếu thành công.')
      } else {
        await showtimeService.create(payload)
        toast.success('Thêm suất chiếu thành công.')
      }
      close()
      await load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      setSaving(true)
      await showtimeService.remove(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Xóa suất chiếu thành công.')
      await load()
    } catch (e) {
      toast.error(e.message)
      setDeleteTarget(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Đang tải suất chiếu..." />

  const activeMovies = movies.filter((m) => m.status === 'ACTIVE')
  const activeCinemas = cinemas.filter((c) => c.status === 'ACTIVE')
  const activeFormRooms = formRooms.filter((r) => r.active)

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Quản lý suất chiếu</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm suất chiếu
        </Button>
      </div>



      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl glass p-4">
        <label className="relative min-w-48 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            placeholder="Tìm theo tên phim, rạp..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-dark-500" />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-red-500/50"
        />
        <select value={filterMovie} onChange={(e) => setFilterMovie(e.target.value)} className="rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-2.5 text-sm text-white outline-none">
          <option value="">Tất cả phim</option>
          {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <select value={filterCinema} onChange={(e) => setFilterCinema(e.target.value)} className="rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-2.5 text-sm text-white outline-none">
          <option value="">Tất cả rạp</option>
          {cinemas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-2.5 text-sm text-white outline-none">
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <DataTable
        rows={filtered}
        emptyText="Không tìm thấy suất chiếu nào."
        columns={[
          { key: 'movieTitle', title: 'Phim', render: (row) => <span className="font-medium text-white">{row.movieTitle}</span> },
          { key: 'cinemaName', title: 'Rạp' },
          { key: 'roomName', title: 'Phòng' },
          { key: 'startTime', title: 'Ngày chiếu', render: (row) => row.startTime ? new Date(row.startTime).toLocaleDateString('vi-VN') : '--' },
          { key: 'startTimeHour', title: 'Giờ BĐ', render: (row) => row.startTime ? new Date(row.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--' },
          { key: 'endTimeHour', title: 'Giờ KT', render: (row) => row.endTime ? new Date(row.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--' },
          { key: 'basePrice', title: 'Giá vé', render: (row) => formatCurrency(row.basePrice) },
          {
            key: 'status', title: 'Trạng thái', render: (row) => (
              <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[row.status] || 'bg-dark-700/50 text-dark-400'}`}>
                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${STATUS_DOTS[row.status] || 'bg-dark-500'}`} />
                {STATUS_LABELS[row.status] || row.status}
              </span>
            ),
          },
          {
            key: 'actions', title: '', render: (row) => (
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-dark-400 transition-all hover:bg-blue-500/10 hover:text-blue-400" title="Sửa"><Edit3 className="h-4 w-4" /></button>
                {isAdmin && <button onClick={() => setDeleteTarget(row)} className="rounded-lg p-2 text-dark-400 transition-all hover:bg-red-500/10 hover:text-red-400" title="Xóa"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ),
          },
        ]}
      />

      {/* Form modal */}
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="mx-auto my-6 max-w-2xl space-y-5 rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editing ? 'Cập nhật suất chiếu' : 'Thêm suất chiếu mới'}</h2>
              <button type="button" onClick={close} className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>



            <div className="grid gap-4 md:grid-cols-2">
              {/* Movie */}
              <Field label="Phim" error={formErrors.movieId}>
                <select name="movieId" value={form.movieId} onChange={change}>
                  <option value="">-- Chọn phim --</option>
                  {activeMovies.map((m) => <option key={m.id} value={m.id}>{m.title} ({m.durationMinutes || 0} phút)</option>)}
                </select>
              </Field>

              {/* Cinema */}
              <Field label="Rạp chiếu" error={formErrors.cinemaId}>
                <select name="cinemaId" value={form.cinemaId} onChange={change}>
                  <option value="">-- Chọn rạp --</option>
                  {activeCinemas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              {/* Room */}
              <Field label="Phòng chiếu" error={formErrors.roomId}>
                <select name="roomId" value={form.roomId} onChange={change} disabled={!form.cinemaId}>
                  <option value="">-- Chọn phòng --</option>
                  {activeFormRooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.totalSeats || 0} ghế)</option>)}
                </select>
              </Field>

              {/* Status */}
              <Field label="Trạng thái">
                <select name="status" value={form.status} onChange={change}>
                  {EDITABLE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </Field>

              {/* Date */}
              <Field label="Ngày chiếu" error={formErrors.date}>
                <input type="date" name="date" value={form.date} onChange={change} />
              </Field>

              {/* Time */}
              <Field label="Giờ bắt đầu" error={formErrors.time}>
                <input type="time" name="time" value={form.time} onChange={change} />
              </Field>

              {/* Base price */}
              <Field label="Giá vé cơ bản (VNĐ)" error={formErrors.basePrice}>
                <input type="number" name="basePrice" min="0" step="1000" value={form.basePrice} onChange={change} placeholder="80000" />
              </Field>

              {/* Auto end time display */}
              <Field label="Giờ kết thúc (tự động)">
                <input type="text" readOnly value={computedEndTime || 'Chọn phim, ngày và giờ để tính'} className="cursor-default opacity-70" />
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={close}>Hủy</Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Đang lưu...
                  </>
                ) : 'Lưu suất chiếu'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirm
        open={Boolean(deleteTarget)}
        title="Xóa suất chiếu"
        message={`Bạn có chắc muốn xóa suất chiếu "${deleteTarget?.movieTitle || ''}" tại ${deleteTarget?.roomName || ''}? Nếu đã có booking, suất chiếu sẽ chuyển sang trạng thái CANCELLED.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
        confirmLabel={saving ? 'Đang xử lý...' : 'Xóa'}
      />
    </section>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-dark-300">
      <span>{label}</span>
      <div className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:border-dark-700/50 [&>*]:bg-dark-800/60 [&>*]:px-3.5 [&>*]:py-2.5 [&>*]:text-white [&>*]:placeholder-dark-500 [&>*]:outline-none [&>*]:transition-all [&>*]:focus:border-red-500/50 [&>*]:focus:ring-2 [&>*]:focus:ring-red-500/20">
        {children}
      </div>
      {error && <span className="block text-xs font-medium text-red-400">{error}</span>}
    </label>
  )
}
