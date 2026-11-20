import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit3, Trash2, ArrowLeft, ArrowRight, X, Loader2 } from 'lucide-react'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import ModalConfirm from '../../components/ModalConfirm'
import cinemaService from '../../services/cinemaService'

const unwrap = (response) => {
  const data = response?.data ?? response
  if (!Array.isArray(data)) throw new Error('Backend quản lý phòng chưa trả về danh sách hợp lệ.')
  return data
}

const emptyForm = { name: '', totalSeats: '', active: true }

export default function RoomList({ cinema, onSelectRoom, onBack, canDelete = true }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteRoom, setDeleteRoom] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await cinemaService.getRooms(cinema.id)
      setRooms(unwrap(res))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [cinema.id])

  useEffect(() => { loadRooms() }, [loadRooms])

  const change = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setModalOpen(true) }
  const openEdit = (room) => {
    setEditing(room)
    setForm({ name: room.name || '', totalSeats: room.totalSeats ?? '', active: room.active !== false })
    setError('')
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.name.trim()) return setError('Vui lòng nhập tên phòng.')
    const totalSeats = Number(form.totalSeats)
    if (form.totalSeats !== '' && (!Number.isInteger(totalSeats) || totalSeats < 0)) return setError('Tổng số ghế phải là số nguyên không âm.')
    const payload = {
      name: form.name.trim(),
      totalSeats: form.totalSeats === '' ? 0 : totalSeats,
      active: form.active,
    }
    try {
      setSaving(true)
      if (editing) {
        await cinemaService.updateRoom(cinema.id, editing.id, payload)
        setSuccess(`Cập nhật phòng "${payload.name}" thành công.`)
      } else {
        await cinemaService.createRoom(cinema.id, payload)
        setSuccess(`Thêm phòng "${payload.name}" thành công.`)
      }
      closeModal()
      await loadRooms()
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
      await cinemaService.removeRoom(cinema.id, deleteRoom.id)
      setSuccess(`Đã xóa phòng "${deleteRoom.name}".`)
      setDeleteRoom(null)
      await loadRooms()
    } catch (e) {
      setError(e.message)
      setDeleteRoom(null)
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
          <span className="hidden sm:inline">Danh sách rạp</span>
        </button>
        <span className="text-dark-600">/</span>
        <span className="text-white font-semibold">{cinema.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Phòng chiếu</h2>
          <p className="text-sm text-dark-400 mt-0.5">{cinema.name} — {cinema.address}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Thêm phòng
        </Button>
      </div>

      <Notification type="error" message={error} />
      <Notification message={success} />

      {/* Table */}
      {loading ? (
        <Loading label="Đang tải phòng..." />
      ) : (
        <DataTable
          rows={rooms}
          emptyText="Chưa có phòng chiếu nào"
          columns={[
            {
              key: 'name',
              title: 'Tên phòng',
              render: (row) => <span className="font-semibold text-white">{row.name}</span>,
            },
            {
              key: 'totalSeats',
              title: 'Tổng số ghế',
              render: (row) => (
                <span className="text-dark-300">{row.totalSeats ?? 0} ghế</span>
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
                    onClick={() => onSelectRoom(row)}
                    className="rounded-lg p-2 text-dark-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
                    title="Quản lý ghế"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(row)}
                    className="rounded-lg p-2 text-dark-400 hover:bg-blue-500/10 hover:text-blue-400 transition"
                    title="Sửa"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {canDelete && <button
                    onClick={() => setDeleteRoom(row)}
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

      {/* Room Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-5 rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Cập nhật phòng' : 'Thêm phòng mới'}
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
                <span>Tên phòng <span className="text-red-400">*</span></span>
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  placeholder="Phòng 1"
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                />
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-dark-300">
                <span>Tổng số ghế</span>
                <input
                  name="totalSeats"
                  type="number"
                  min="0"
                  value={form.totalSeats}
                  onChange={change}
                  placeholder="0"
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-medium text-dark-300">
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

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>Hủy</Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  editing ? 'Cập nhật' : 'Thêm phòng'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm */}
      <ModalConfirm
        open={Boolean(deleteRoom)}
        title="Xóa phòng chiếu"
        message={`Bạn có chắc muốn xóa phòng "${deleteRoom?.name || ''}"? Tất cả ghế trong phòng cũng sẽ bị xóa. Thao tác này không thể hoàn tác.`}
        onCancel={() => setDeleteRoom(null)}
        onConfirm={handleDelete}
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa'}
      />
    </div>
  )
}
