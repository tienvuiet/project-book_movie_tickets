import { Edit3, ImagePlus, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import ModalConfirm from '../../components/ModalConfirm'
import genreService from '../../services/genreService'
import movieService from '../../services/movieService'

const emptyForm = { title: '', description: '', durationMinutes: '', releaseDate: '', trailerUrl: '', status: 'ACTIVE', genreIds: [] }
const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/i
const unwrap = (response) => response?.data ?? response ?? []

export default function MovieManagementPage() {
  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [poster, setPoster] = useState(null)
  const [backdrop, setBackdrop] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteMovie, setDeleteMovie] = useState(null)

  const load = async () => {
    try {
      const [movieResponse, genreResponse] = await Promise.all([movieService.getAll(), genreService.getAll()])
      setMovies(unwrap(movieResponse))
      setGenres(unwrap(genreResponse))
    } catch (e) { toast.error(e.message) }
  }
  useEffect(() => {
    Promise.all([movieService.getAll(), genreService.getAll()])
      .then(([movieResponse, genreResponse]) => { setMovies(unwrap(movieResponse)); setGenres(unwrap(genreResponse)) })
      .catch((e) => toast.error(e.message))
  }, [])

  const rows = useMemo(() => movies.filter((movie) => movie.title?.toLowerCase().includes(query.toLowerCase())), [movies, query])
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const toggleGenre = (id) => setForm((current) => ({ ...current, genreIds: current.genreIds.includes(id) ? current.genreIds.filter((item) => item !== id) : [...current.genreIds, id] }))
  const close = () => { setOpen(false); setEditing(null); setForm(emptyForm); setPoster(null); setBackdrop(null) }
  const openCreate = () => { setEditing(null); setForm(emptyForm); setPoster(null); setBackdrop(null); setOpen(true) }
  const openEdit = (movie) => {
    setEditing(movie); setPoster(null); setBackdrop(null)
    setForm({ title: movie.title || '', description: movie.description || '', durationMinutes: movie.durationMinutes || '', releaseDate: movie.releaseDate || '', trailerUrl: movie.trailerUrl || '', status: movie.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE', genreIds: movie.genres?.map((genre) => genre.id) || [], posterUrl: movie.posterUrl, backdropUrl: movie.backdropUrl })
    setOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!editing && (!poster || !backdrop)) { toast.error('Vui lòng chọn đầy đủ poster và backdrop.'); return }
    if (!youtubePattern.test(form.trailerUrl)) { toast.error('Trailer phải là một link YouTube hợp lệ.'); return }
    if (!form.genreIds.length) { toast.error('Vui lòng chọn ít nhất một thể loại.'); return }
    const data = new FormData()
    data.append('movie', new Blob([JSON.stringify({ ...form, durationMinutes: Number(form.durationMinutes) })], { type: 'application/json' }))
    if (poster) data.append('poster', poster)
    if (backdrop) data.append('backdrop', backdrop)
    try {
      setSaving(true)
      if (editing) await movieService.update(editing.id, data)
      else await movieService.create(data)
      const message = editing ? 'Cập nhật phim thành công.' : 'Thêm phim thành công.'
      close(); toast.success(message); await load()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const remove = async () => {
    try {
      setSaving(true)
      await movieService.remove(deleteMovie.id)
      setDeleteMovie(null); toast.success('Xóa phim thành công.'); await load()
    } catch (e) { toast.error(e.message); setDeleteMovie(null) } finally { setSaving(false) }
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Quản lý phim</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm phim
        </Button>
      </div>



      {/* Search */}
      <div className="rounded-2xl glass p-4">
        <label className="relative block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-dark-500 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
            placeholder="Tìm theo tên phim..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {/* Table */}
      <DataTable
        rows={rows}
        columns={[
          {
            key: 'posterUrl',
            title: 'Poster',
            render: (row) =>
              row.posterUrl ? (
                <img src={row.posterUrl} alt={row.title} className="h-16 w-11 rounded-lg object-cover ring-1 ring-dark-700/50" />
              ) : (
                <div className="flex h-16 w-11 items-center justify-center rounded-lg bg-dark-800/60 text-dark-500">
                  <ImagePlus className="h-4 w-4" />
                </div>
              ),
          },
          { key: 'title', title: 'Tên phim' },
          { key: 'durationMinutes', title: 'Thời lượng', render: (row) => `${row.durationMinutes || 0} phút` },
          { key: 'releaseDate', title: 'Ngày khởi chiếu' },
          {
            key: 'status',
            title: 'Trạng thái',
            render: (row) => (
              <span
                className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  row.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-dark-700/50 text-dark-400'
                }`}
              >
                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-dark-500'}`} />
                {row.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              </span>
            ),
          },
          {
            key: 'actions', title: '', render: (row) => <div className="flex gap-1">
              <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-dark-400 hover:bg-blue-500/10 hover:text-blue-400" title="Sửa"><Edit3 className="h-4 w-4" /></button>
              <button onClick={() => setDeleteMovie(row)} className="rounded-lg p-2 text-dark-400 hover:bg-red-500/10 hover:text-red-400" title="Xóa"><Trash2 className="h-4 w-4" /></button>
            </div>,
          },
        ]}
      />

      {/* Add movie modal */}
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={submit}
            className="mx-auto my-6 max-w-4xl space-y-5 rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editing ? 'Cập nhật phim' : 'Thêm phim mới'}</h2>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>



            {/* Form fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tên phim">
                <input required name="title" value={form.title} onChange={change} />
              </Field>
              <Field label="Thời lượng (phút)">
                <input required min="1" type="number" name="durationMinutes" value={form.durationMinutes} onChange={change} />
              </Field>
              <Field label="Ngày khởi chiếu">
                <input required type="date" name="releaseDate" value={form.releaseDate} onChange={change} />
              </Field>
              <Field label="Trạng thái">
                <select name="status" value={form.status} onChange={change}>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </Field>
              <Field label="Link trailer YouTube" className="md:col-span-2">
                <input required type="url" name="trailerUrl" placeholder="https://www.youtube.com/watch?v=..." value={form.trailerUrl} onChange={change} />
              </Field>
              <Field label="Mô tả" className="md:col-span-2">
                <textarea rows="4" name="description" value={form.description} onChange={change} />
              </Field>

              {/* Image upload areas */}
              <ImageField label="Poster" file={poster} currentUrl={editing?.posterUrl} required={!editing} onChange={setPoster} ratio="aspect-[2/3]" />
              <ImageField label="Backdrop" file={backdrop} currentUrl={editing?.backdropUrl} required={!editing} onChange={setBackdrop} ratio="aspect-video" />
            </div>

            {/* Genre selection */}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-dark-300">Thể loại</legend>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <label
                    key={genre.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all duration-200 ${
                      form.genreIds.includes(genre.id)
                        ? 'border-red-500/50 bg-red-500/10 text-red-300'
                        : 'border-dark-700/50 bg-dark-800/40 text-dark-400 hover:border-dark-600 hover:text-dark-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.genreIds.includes(genre.id)}
                      onChange={() => toggleGenre(genre.id)}
                      className="sr-only"
                    />
                    {genre.name}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>Hủy</Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Đang tải ảnh...
                  </>
                ) : (
                  'Lưu phim'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
      <ModalConfirm open={Boolean(deleteMovie)} title="Xóa phim" message={`Bạn có chắc muốn xóa phim “${deleteMovie?.title || ''}”? Thao tác này không thể hoàn tác.`} onCancel={() => setDeleteMovie(null)} onConfirm={remove} confirmLabel={saving ? 'Đang xóa...' : 'Xóa'} />
    </section>
  )
}

function Field({ label, className = '', children }) {
  return (
    <label className={`space-y-1.5 text-sm font-medium text-dark-300 ${className}`}>
      <span>{label}</span>
      <div className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:border-dark-700/50 [&>*]:bg-dark-800/60 [&>*]:px-3.5 [&>*]:py-2.5 [&>*]:text-white [&>*]:placeholder-dark-500 [&>*]:outline-none [&>*]:transition-all [&>*]:focus:border-red-500/50 [&>*]:focus:ring-2 [&>*]:focus:ring-red-500/20">
        {children}
      </div>
    </label>
  )
}

function ImageField({ label, file, currentUrl, required, onChange, ratio }) {
  const preview = file ? URL.createObjectURL(file) : null
  return (
    <div className="space-y-2 text-sm font-medium text-dark-300">
      <span>{label}</span>
      <label className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-dark-700/50 bg-dark-800/30 transition-all hover:border-dark-600 hover:bg-dark-800/50 ${ratio} overflow-hidden`}>
        {preview || currentUrl ? (
          <img
            src={preview || currentUrl}
            alt={`Xem trước ${label}`}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-dark-500">
            <Upload className="h-8 w-8 transition-transform group-hover:scale-110 group-hover:text-dark-400" />
            <span className="text-xs">Kéo thả hoặc click để tải lên</span>
          </div>
        )}
        <input
          required={required}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="sr-only"
        />
      </label>
    </div>
  )
}
