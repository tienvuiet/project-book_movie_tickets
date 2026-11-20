import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Search, Edit3, Trash2, ChevronRight, X, Loader2, Building2 } from 'lucide-react'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import ModalConfirm from '../../components/ModalConfirm'
import cinemaService from '../../services/cinemaService'

const unwrap = (response) => {
  const data = response?.data ?? response
  if (!Array.isArray(data)) throw new Error('Backend quản lý rạp chưa trả về danh sách hợp lệ.')
  return data
}

const emptyForm = { name: '', address: '', phone: '', status: 'ACTIVE' }

export default function CinemaList({ onSelectCinema, selectedCinemaId, allowedCinemaId = null, isAdmin = true }) {
  const [cinemas, setCinemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteCinema, setDeleteCinema] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadCinemas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await cinemaService.getAll()
      const rows = unwrap(res)
      setCinemas(allowedCinemaId == null ? rows : rows.filter((cinema) => cinema.id === Number(allowedCinemaId)))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [allowedCinemaId])

  useEffect(() => { loadCinemas() }, [loadCinemas])

  const rows = useMemo(() => {
    const q = query.toLowerCase()
    return cinemas.filter(
      (c) => (c.name || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q)
    )
  }, [cinemas, query])

  const change = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setModalOpen(true) }
  const openEdit = (cinema) => {
    setEditing(cinema)
    setForm({
      name: cinema.name || '',
      address: cinema.address || '',
      phone: cinema.phone || '',
      status: cinema.status || 'ACTIVE',
    })
    setError('')
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.name.trim()) return setError('Vui lòng nhập tên rạp.')
    if (!form.address.trim()) return setError('Vui lòng nhập địa chỉ.')
    const payload = { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim(), status: form.status }
    try {
      setSaving(true)
      if (editing) {
        await cinemaService.update(editing.id, payload)
        setSuccess(`Cập nhật rạp "${payload.name}" thành công.`)
      } else {
        await cinemaService.create(payload)
        setSuccess(`Thêm rạp "${payload.name}" thành công.`)
      }
      closeModal()
      await loadCinemas()
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      setError('')
      setSuccess('')
      await cinemaService.remove(deleteCinema.id)
      setSuccess(`Đã xóa rạp "${deleteCinema.name}".`)
      setDeleteCinema(null)
      await loadCinemas()
    } catch (e) {
      setError(e.message)
      setDeleteCinema(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Danh sách rạp chiếu</h2>
          <p className="text-sm text-dark-400 mt-0.5">{cinemas.length} rạp</p>
        </div>
        {isAdmin && <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Thêm rạp
        </Button>}
      </div>

      <Notification type="error" message={error} />
      <Notification message={success} />

      {/* Search */}
      <div className="rounded-2xl glass p-4">
        <label className="relative block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            placeholder="Tìm theo tên rạp hoặc địa chỉ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <Loading label="Đang tải danh sách rạp..." />
      ) : (
        <DataTable
          rows={rows}
          emptyText="Chưa có rạp chiếu nào"
          columns={[
            {
              key: 'name',
              title: 'Tên rạp',
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedCinemaId === row.id ? 'gradient-brand text-white shadow-glow-sm' : 'bg-dark-800/60 text-dark-400'
                  }`}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-white">{row.name}</span>
                </div>
              ),
            },
            {
              key: 'address',
              title: 'Địa chỉ',
              render: (row) => <span className="text-dark-300 text-sm">{row.address}</span>,
            },
            {
              key: 'phone',
              title: 'Số điện thoại',
              render: (row) => <span className="text-dark-300">{row.phone || '—'}</span>,
            },
            {
              key: 'status',
              title: 'Trạng thái',
              render: (row) => (
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dark-700/50 text-dark-400'
                }`}>
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-dark-500'}`} />
                  {row.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
                </span>
              ),
            },
            {
              key: 'actions',
              title: '',
              render: (row) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => onSelectCinema(row)}
                    className="rounded-lg p-2 text-dark-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
                    title="Quản lý phòng"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(row) }}
                    className="rounded-lg p-2 text-dark-400 hover:bg-blue-500/10 hover:text-blue-400 transition"
                    title="Sửa"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {isAdmin && <button
                    onClick={(e) => { e.stopPropagation(); setDeleteCinema(row) }}
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

      {/* Cinema Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={submit}
            className="w-full max-w-lg space-y-5 rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Cập nhật rạp' : 'Thêm rạp mới'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Notification type="error" message={error} />

            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium text-dark-300">
                <span>Tên rạp <span className="text-red-400">*</span></span>
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  placeholder="CGV Vincom Bà Triệu"
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                />
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-dark-300">
                <span>Địa chỉ <span className="text-red-400">*</span></span>
                <input
                  name="address"
                  value={form.address}
                  onChange={change}
                  placeholder="191 Bà Triệu, Hai Bà Trưng, Hà Nội"
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                />
                <span className="block text-xs font-normal text-dark-500">Hệ thống sẽ tự tìm tọa độ trên OpenStreetMap khi lưu.</span>
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-dark-300">
                <span>Số điện thoại</span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={change}
                  placeholder="024 xxxx xxxx"
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                />
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-dark-300">
                <span>Trạng thái</span>
                <select
                  name="status"
                  value={form.status}
                  onChange={change}
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>Hủy</Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  editing ? 'Cập nhật' : 'Thêm rạp'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm */}
      <ModalConfirm
        open={Boolean(deleteCinema)}
        title="Xóa rạp chiếu"
        message={`Bạn có chắc muốn xóa rạp "${deleteCinema?.name || ''}"? Tất cả phòng và ghế trong rạp cũng sẽ bị xóa. Thao tác này không thể hoàn tác.`}
        onCancel={() => setDeleteCinema(null)}
        onConfirm={handleDelete}
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa'}
      />
    </div>
  )
}
