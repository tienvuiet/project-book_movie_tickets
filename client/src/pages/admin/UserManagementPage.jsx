import { Edit3, LockKeyhole, Plus, Search, Trash2, UnlockKeyhole, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import FormInput from '../../components/FormInput'
import Loading from '../../components/Loading'
import ModalConfirm from '../../components/ModalConfirm'
import userService from '../../services/userService'
import cinemaService from '../../services/cinemaService'

const emptyForm = { fullName: '', email: '', phone: '', password: '', role: 'CUSTOMER', cinemaId: '' }

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [cinemas, setCinemas] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [userResponse, cinemaResponse] = await Promise.all([userService.getAll(), cinemaService.getAll()])
        if (mounted) {
          setUsers(userResponse.data || [])
          setCinemas((cinemaResponse.data || []).filter((cinema) => cinema.status === 'ACTIVE'))
        }
      } catch (error) {
        if (mounted) toast.error(error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return users.filter((user) => {
      if (status && user.status !== status) return false
      if (!keyword) return true
      return `${user.fullName} ${user.email} ${user.phone || ''}`.toLowerCase().includes(keyword)
    })
  }, [users, query, status])

  const openForm = (user = null) => {
    setEditing(user || {})
    setForm(user ? { fullName: user.fullName, email: user.email, phone: user.phone || '', password: '', role: user.roles?.[0] || 'CUSTOMER', cinemaId: user.cinemaId || '' } : emptyForm)
  }

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const save = async (event) => {
    event.preventDefault()
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Vui lòng nhập họ tên và email.')
      return
    }
    if (!editing.id && form.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }
    if (form.role === 'STAFF' && !form.cinemaId) {
      toast.error('Vui lòng chọn rạp làm việc cho nhân viên.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, cinemaId: form.role === 'STAFF' ? Number(form.cinemaId) : null, roles: [form.role] }
      const response = editing.id
        ? await userService.update(editing.id, payload)
        : await userService.create(payload)
      const saved = response.data
      setUsers((current) => editing.id
        ? current.map((user) => user.id === saved.id ? saved : user)
        : [saved, ...current])
      setEditing(null)
      toast.success(editing.id ? 'Đã cập nhật người dùng.' : 'Đã tạo tài khoản người dùng.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const runConfirmedAction = async () => {
    const action = confirm
    setConfirm(null)
    try {
      if (action.type === 'delete') {
        await userService.remove(action.user.id)
        setUsers((current) => current.filter((user) => user.id !== action.user.id))
        toast.success('Đã xóa người dùng.')
      } else {
        const nextStatus = action.user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
        const response = await userService.updateStatus(action.user.id, nextStatus)
        setUsers((current) => current.map((user) => user.id === action.user.id ? response.data : user))
        toast.success(nextStatus === 'ACTIVE' ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.')
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const columns = [
    { key: 'employee', title: 'Nhân viên', render: (user) => <div><p className="font-semibold text-white">{user.fullName}</p><p className="text-xs text-dark-400">{user.email}</p></div> },
    { key: 'phone', title: 'Điện thoại', render: (user) => user.phone || '—' },
    { key: 'cinema', title: 'Rạp làm việc', render: (user) => user.roles?.includes('STAFF') ? (user.cinemaName || 'Chưa phân công') : '—' },
    { key: 'role', title: 'Vai trò', render: (user) => <div className="flex flex-wrap gap-1">{(user.roles || []).map((role) => <span key={role} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' : role === 'STAFF' ? 'bg-blue-500/10 text-blue-400' : 'bg-dark-700/60 text-dark-300'}`}>{role}</span>)}</div> },
    { key: 'status', title: 'Trạng thái', render: (user) => <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}</span> },
    { key: 'actions', title: '', render: (user) => <div className="flex justify-end gap-1">
      <button onClick={() => openForm(user)} className="rounded-lg p-2 text-dark-400 hover:bg-blue-500/10 hover:text-blue-400" title="Chỉnh sửa"><Edit3 className="h-4 w-4" /></button>
      <button onClick={() => setConfirm({ type: 'status', user })} className="rounded-lg p-2 text-dark-400 hover:bg-amber-500/10 hover:text-amber-400" title={user.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}>{user.status === 'ACTIVE' ? <LockKeyhole className="h-4 w-4" /> : <UnlockKeyhole className="h-4 w-4" />}</button>
      {!user.roles?.includes('ADMIN') && <button onClick={() => setConfirm({ type: 'delete', user })} className="rounded-lg p-2 text-dark-400 hover:bg-red-500/10 hover:text-red-400" title="Xóa"><Trash2 className="h-4 w-4" /></button>}
    </div> },
  ]

  if (loading) return <Loading label="Đang tải danh sách nhân viên..." />

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Users className="h-6 w-6 text-red-400" />Quản lý người dùng</h1><p className="mt-1 text-sm text-dark-400">Quản lý khách hàng, nhân viên và quản trị viên trong hệ thống.</p></div>
      <Button onClick={() => openForm()}><Plus className="h-4 w-4" />Thêm người dùng</Button>
    </div>

    <div className="grid gap-3 rounded-2xl glass p-4 sm:grid-cols-[1fr_220px]">
      <label className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, email, số điện thoại..." className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-red-500/50" /></label>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-2.5 text-sm text-white outline-none"><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="LOCKED">Đã khóa</option></select>
    </div>
    <DataTable rows={rows} columns={columns} emptyText="Không tìm thấy người dùng phù hợp." />

    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"><form onSubmit={save} className="w-full max-w-xl rounded-2xl glass-strong p-6 shadow-glass-lg">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">{editing.id ? 'Cập nhật người dùng' : 'Thêm người dùng'}</h2><button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-dark-400 hover:bg-dark-700"><X className="h-5 w-5" /></button></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormInput label="Họ và tên" name="fullName" value={form.fullName} onChange={change} required /><FormInput label="Email" name="email" type="email" value={form.email} onChange={change} required /><FormInput label="Số điện thoại" name="phone" value={form.phone} onChange={change} /><FormInput label={editing.id ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'} name="password" type="password" minLength={6} value={form.password} onChange={change} required={!editing.id} /><label className="space-y-1.5 text-sm font-medium text-dark-300"><span>Vai trò</span><select name="role" value={form.role} onChange={change} className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none"><option value="CUSTOMER">Khách hàng</option><option value="STAFF">Nhân viên</option><option value="ADMIN">Quản trị viên</option></select></label>{form.role === 'STAFF' && <label className="space-y-1.5 text-sm font-medium text-dark-300"><span>Rạp làm việc</span><select name="cinemaId" value={form.cinemaId} onChange={change} required className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3.5 py-2.5 text-white outline-none focus:border-red-500/50"><option value="">Chọn rạp</option>{cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}</select></label>}</div>

      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu người dùng'}</Button></div>
    </form></div>}

    <ModalConfirm open={Boolean(confirm)} title={confirm?.type === 'delete' ? 'Xóa nhân viên' : confirm?.user?.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} message={confirm?.type === 'delete' ? `Bạn có chắc muốn xóa ${confirm?.user?.fullName}?` : `Xác nhận thay đổi trạng thái tài khoản của ${confirm?.user?.fullName}?`} confirmLabel="Xác nhận" onCancel={() => setConfirm(null)} onConfirm={runConfirmedAction} />
  </section>
}
