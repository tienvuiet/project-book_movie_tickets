import { Edit3, Filter, Plus, Search, Trash2, X, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import FormInput from '../../components/FormInput'
import ModalConfirm from '../../components/ModalConfirm'
import userService from '../../services/userService'
import cinemaService from '../../services/cinemaService'
import { friendlyError } from '../../utils/errorMapper'

export default function StaffManagementPage() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [cinemas, setCinemas] = useState([])
  
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    cinemaId: '',
    status: 'ACTIVE'
  })
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch data
  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch all cinemas for assignment dropdown
        const cinemasRes = await cinemaService.getAll()
        if (mounted) setCinemas(cinemasRes?.data || cinemasRes || [])

        // Fetch users
        // Note: Attempting to pass role=STAFF. If backend doesn't support it, we filter client-side.
        const usersRes = await userService.getAll({ role: 'STAFF' })
        const allUsers = usersRes?.data || usersRes?.content || usersRes || []
        
        // Ensure we only show STAFF (fallback if API didn't filter)
        const staffUsers = allUsers.filter(u => u.roles?.includes('STAFF'))
        if (mounted) setRows(staffUsers)

      } catch (err) {
        if (mounted) toast.error(friendlyError(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [])

  // Search filter
  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const searchStr = `${row.fullName} ${row.email} ${row.phone}`.toLowerCase()
      return searchStr.includes(query.toLowerCase())
    })
  }, [rows, query])

  const openForm = (row = null) => {
    if (row) {
      setEditing(row)
      setForm({
        fullName: row.fullName || row.name || '',
        email: row.email || '',
        password: '', // blank when editing
        phone: row.phone || '',
        cinemaId: row.cinemaId || '',
        status: row.status || 'ACTIVE'
      })
    } else {
      setEditing({})
      setForm({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        cinemaId: '',
        status: 'ACTIVE'
      })
    }
  }

  const save = async () => {
    const { fullName, email, password, phone, cinemaId, status } = form
    if (!fullName.trim() || !email.trim()) { toast.error('Vui lòng nhập đầy đủ họ tên và email.'); return }
    if (!editing.id && !password) { toast.error('Vui lòng cấp mật khẩu cho tài khoản mới.'); return }
    if (!cinemaId) { toast.error('Vui lòng chọn rạp trực thuộc.'); return }

    try {
      setSaving(true)
      
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cinemaId,
        status,
        roles: ['STAFF']
      }

      if (!editing.id) {
        payload.password = password
      }

      const response = editing.id
        ? await userService.update(editing.id, payload)
        : await userService.create(payload)
      
      const saved = response?.data || response
      
      // Update local state
      setRows((items) => {
        if (editing.id) {
          return items.map((item) => item.id === editing.id ? { ...item, ...saved } : item)
        }
        return [...items, saved]
      })
      
      setEditing(null)
      toast.success(editing.id ? 'Cập nhật nhân viên thành công.' : 'Thêm nhân viên mới thành công.')
    } catch (saveError) {
      toast.error(friendlyError(saveError))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      await userService.remove(deleteId)
      setRows((items) => items.filter((item) => item.id !== deleteId))
      setDeleteId(null)
      toast.success('Đã xóa nhân viên.')
    } catch (removeError) {
      toast.error(friendlyError(removeError))
      setDeleteId(null)
    }
  }

  // Get cinema name helper
  const getCinemaName = (id) => {
    const c = cinemas.find(c => String(c.id) === String(id))
    return c ? c.name : '—'
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Quản lý Nhân viên</h1>
        <Button onClick={() => openForm(null)}>
          <Plus className="h-4 w-4" />
          Thêm nhân viên
        </Button>
      </div>



      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl glass p-4">
        <label className="relative min-w-[280px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            placeholder="Tìm theo tên, email, sđt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {/* Data Table */}
      <DataTable
        rows={filtered}
        columns={[
          { 
            key: 'fullName', 
            title: 'Họ và tên',
            render: (r) => <span className="font-semibold text-white">{r.fullName || r.name}</span>
          },
          { 
            key: 'contact', 
            title: 'Liên hệ',
            render: (r) => (
              <div>
                <p className="text-sm text-dark-200">{r.email}</p>
                <p className="text-xs text-dark-400">{r.phone || '—'}</p>
              </div>
            )
          },
          {
            key: 'cinema',
            title: 'Rạp trực thuộc',
            render: (r) => (
              <span className="inline-flex items-center gap-1.5 text-sm text-orange-400 font-medium bg-orange-400/10 px-2.5 py-1 rounded-lg border border-orange-400/20">
                <MapPin className="h-3.5 w-3.5" />
                {r.cinemaName || getCinemaName(r.cinemaId)}
              </span>
            )
          },
          { 
            key: 'status', 
            title: 'Trạng thái',
            render: (r) => (
              <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                r.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-dark-700/50 text-dark-400 border border-dark-600/50'
              }`}>
                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-dark-500'}`} />
                {r.status}
              </span>
            )
          },
          {
            key: 'actions',
            title: '',
            render: (row) => (
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={() => openForm(row)}
                  className="rounded-lg p-2 text-dark-400 transition-all hover:bg-blue-500/10 hover:text-blue-400"
                  title="Sửa"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteId(row.id)}
                  className="rounded-lg p-2 text-dark-400 transition-all hover:bg-red-500/10 hover:text-red-400"
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        emptyText={loading ? 'Đang tải dữ liệu...' : 'Chưa có nhân viên nào.'}
      />

      {/* Edit Form Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">
                {editing.id ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <FormInput 
                label="Họ và tên *" 
                value={form.fullName} 
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} 
                placeholder="VD: Nguyễn Văn A"
              />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput 
                  label="Email *" 
                  type="email"
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  disabled={Boolean(editing.id)} // Usually don't allow changing email after creation
                />
                <FormInput 
                  label="Số điện thoại" 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                />
              </div>

              {!editing.id && (
                <FormInput 
                  label="Mật khẩu *" 
                  type="password"
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  placeholder="Tối thiểu 6 ký tự"
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-dark-300">
                  <span>Rạp phân công *</span>
                  <select 
                    value={form.cinemaId} 
                    onChange={(e) => setForm({ ...form, cinemaId: e.target.value })} 
                    className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none focus:border-red-500/50"
                  >
                    <option value="">-- Chọn rạp --</option>
                    {cinemas.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm font-medium text-dark-300">
                  <span>Trạng thái</span>
                  <select 
                    value={form.status} 
                    onChange={(e) => setForm({ ...form, status: e.target.value })} 
                    className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none focus:border-red-500/50"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Khóa (INACTIVE)</option>
                  </select>
                </label>
              </div>
            </div>



            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-dark-700/50">
              <Button variant="outline" onClick={() => setEditing(null)}>Hủy bỏ</Button>
              <Button onClick={save} disabled={saving} className="min-w-[120px]">
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirm
        open={Boolean(deleteId)}
        title="Xóa nhân viên"
        message="Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác."
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
        confirmLabel="Xóa nhân viên"
      />
    </section>
  )
}
