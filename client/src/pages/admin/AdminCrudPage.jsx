import { Edit3, Filter, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import FormInput from '../../components/FormInput'
import ModalConfirm from '../../components/ModalConfirm'

export default function AdminCrudPage({ title, entityName = 'bản ghi', service, columns, canDelete = () => true }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', status: 'ACTIVE' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    service?.getAll?.().then((response) => setRows(response?.data || response || [])).catch(() => setRows([]))
  }, [service])

  const filtered = useMemo(
    () => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  )

  const tableColumns = columns || [
    { key: 'name', title: 'Tên' },
    { key: 'status', title: 'Trạng thái' },
    { key: 'updatedAt', title: 'Cập nhật' },
  ]

  const remove = async () => {
    try {
      await service.remove(deleteId)
      setRows((items) => items.filter((item) => item.id !== deleteId))
      setDeleteId(null)
      toast.success('Đã xóa thành công!')
    } catch (removeError) {
      toast.error(removeError.message || 'Không thể xóa dữ liệu.')
      setDeleteId(null)
    }
  }

  const openForm = (row = {}) => {
    setEditing(row)
    setForm({ name: row.name || '', status: row.status || 'ACTIVE' })
  }

  const save = async () => {
    const name = form.name.trim()
    if (!name) { toast.error('Vui lòng nhập tên.'); return }
    try {
      setSaving(true)
      const response = editing.id
        ? await service.update(editing.id, { ...form, name })
        : await service.create({ ...form, name })
      const saved = response?.data || response
      setRows((items) => editing.id
        ? items.map((item) => item.id === editing.id ? saved : item)
        : [...items, saved])
      setEditing(null)
      toast.success(editing.id ? 'Cập nhật thành công!' : 'Thêm mới thành công!')
    } catch (saveError) {
      toast.error(saveError.message || 'Không thể lưu dữ liệu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4" />
          Thêm mới
        </Button>
      </div>



      {/* Search & filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl glass p-4">
        <label className="relative min-w-64 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            placeholder="Tìm kiếm, lọc..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-dark-500" />
          <select className="rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-red-500/50">
            <option>Trạng thái</option>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
          </select>
        </div>
      </div>

      {/* Data table */}
      <DataTable
        rows={filtered}
        columns={[
          ...tableColumns.map((col) => ({
            ...col,
            render: col.render || (col.key === 'status'
              ? (row) => (
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    row.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-dark-700/50 text-dark-400'
                  }`}
                >
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-dark-500'}`} />
                  {row.status}
                </span>
              )
              : undefined),
          })),
          {
            key: 'actions',
            title: '',
            render: (row) => (
              <div className="flex gap-1.5">
                <button
                  onClick={() => openForm(row)}
                  className="rounded-lg p-2 text-dark-400 transition-all hover:bg-blue-500/10 hover:text-blue-400"
                  title="Sửa"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                {canDelete(row) && (
                  <button
                    onClick={() => setDeleteId(row.id)}
                    className="rounded-lg p-2 text-dark-400 transition-all hover:bg-red-500/10 hover:text-red-400"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Edit form modal */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editing.id ? 'Cập nhật' : 'Thêm'} {entityName}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="Tên" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <label className="space-y-1.5 text-sm font-medium text-dark-300">
                <span>Trạng thái</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirm
        open={Boolean(deleteId)}
        message={`Bạn có chắc muốn xóa ${entityName} này?`}
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
        confirmLabel="Xóa"
      />
    </section>
  )
}
