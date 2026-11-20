import {
  AlertTriangle, ArrowLeft, BadgePercent, Calendar, ChevronDown, ChevronUp,
  DollarSign, Eye, ImageIcon, Info, Loader2, RefreshCw, Save, Tag, Upload, Users, X, Zap, MapPin, Film,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  Alignment, BlockQuote, Bold, ClassicEditor, Essentials, Heading,
  Italic, Link as LinkPlugin, List, Paragraph, Underline,
} from 'ckeditor5'
import 'ckeditor5/ckeditor5.css'
import promotionService, { fmtVND, calcDiscountAmount } from '../../services/promotionService'
import cinemaService from '../../services/cinemaService'
import movieService from '../../services/movieService'

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const genCode = () => 'PM' + Math.random().toString(36).slice(2, 8).toUpperCase()
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

const EMPTY = {
  code: '', name: '', description: '', imageUrl: '', active: false,
  discountType: 'PERCENT', discountValue: '', maxDiscount: '', minOrderValue: '',
  startDate: '', endDate: '', weekdays: [],
  applyToMovies: 'ALL', applyCinemas: 'ALL',
  movieIds: [], cinemaIds: [],
  maxUsage: '', maxPerUser: 1,
  allowStack: false, requireLogin: true,
}

/* ─── Section collapse ──────────────────────────────────────────────────────── */
function Section({ icon: Icon, title, color = '#e11d48', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,.06)' : 'none' }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{title}</span>
        {open ? <ChevronUp size={15} color="#64748b" /> : <ChevronDown size={15} color="#64748b" />}
      </button>
      {open && <div style={{ padding: '18px 18px 22px' }}>{children}</div>}
    </div>
  )
}

/* ─── Field wrapper ─────────────────────────────────────────────────────────── */
function Field({ label, required, children, hint, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint  && <p style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={10} />{error}</p>}
    </div>
  )
}

const inp = (err) => ({
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.04)', color: '#f1f5f9',
  border: `1px solid ${err ? 'rgba(239,68,68,.6)' : 'rgba(255,255,255,.1)'}`,
  borderRadius: 8, padding: '10px 13px', fontSize: 13, outline: 'none',
})
const sel = (err) => ({ ...inp(err), cursor: 'pointer', appearance: 'none' })

/* ─── MultiSelect for cinemas/movies ────────────────────────────────────────── */
function MultiSelect({ items, selected, onChange, placeholder = 'Chọn...' }) {
  const [open, setOpen] = useState(false)
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ ...inp(false), display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <span style={{ color: selected.length ? '#f1f5f9' : '#475569' }}>
          {selected.length ? `Đã chọn ${selected.length} mục` : placeholder}
        </span>
        <ChevronDown size={13} color="#64748b" />
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto' }}>
          {items.length === 0 && <div style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>Không có dữ liệu</div>}
          {items.map((item) => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 13, color: '#cbd5e1' }}>
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} style={{ accentColor: '#e11d48' }} />
              {item.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function PromotionFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id && id !== 'new')

  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [showActiveWarn, setShowActiveWarn] = useState(false)
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  // Lookup data
  const [cinemas, setCinemas] = useState([])
  const [movies, setMovies]   = useState([])

  // Load cinemas & movies for scope selectors
  useEffect(() => {
    cinemaService.getAll?.().then((r) => setCinemas(Array.isArray(r) ? r : (r?.data ?? []))).catch(() => {})
    movieService.getAll?.().then((r) => setMovies(Array.isArray(r) ? r : (r?.data ?? []))).catch(() => {})
  }, [])

  // Load existing promo when editing
  useEffect(() => {
    if (!isEdit) return
    setLoadingEdit(true)
    promotionService.getById(id)
      .then((p) => {
        setForm({
          code:           p.code || '',
          name:           p.name || '',
          description:    p.description || '',
          imageUrl:       p.imageUrl || '',
          active:         p.active ?? false,
          discountType:   p.discountType || 'PERCENT',
          discountValue:  String(p.discountValue || ''),
          maxDiscount:    String(p.maxDiscount || ''),
          minOrderValue:  String(p.minOrderValue || ''),
          startDate:      p.startDate ? p.startDate.slice(0, 16) : '',
          endDate:        p.endDate   ? p.endDate.slice(0, 16)   : '',
          weekdays:       p.weekdays  || [],
          applyToMovies:  p.applyToMovies  || 'ALL',
          applyCinemas:   p.applyCinemas   || 'ALL',
          movieIds:       p.movieIds  || [],
          cinemaIds:      p.cinemaIds || [],
          maxUsage:       String(p.maxUsage || ''),
          maxPerUser:     p.maxPerUser || 1,
          allowStack:     p.allowStack ?? false,
          requireLogin:   p.requireLogin !== false,
        })
        if (p.active) setShowActiveWarn(true)
      })
      .catch(() => toast.error('Không thể tải thông tin khuyến mãi'))
      .finally(() => setLoadingEdit(false))
  }, [id, isEdit])

  const set = useCallback((key, val) => {
    setForm((f) => ({ ...f, [key]: val }))
    if (key === 'imageUrl') setImagePreviewFailed(false)
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }, [errors])

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((current) => ({ ...current, image: 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP' }))
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrors((current) => ({ ...current, image: 'Dung lượng ảnh không được vượt quá 10 MB' }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageFile(file)
      setImagePreviewUrl(typeof reader.result === 'string' ? reader.result : '')
      setImagePreviewFailed(false)
      setErrors((current) => {
        const next = { ...current }
        delete next.image
        return next
      })
    }
    reader.onerror = () => toast.error('Không thể đọc tệp ảnh đã chọn')
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreviewUrl('')
    set('imageUrl', '')
  }

  /* Preview */
  const PREVIEW_AMOUNT = 300000
  const previewDiscount = useMemo(() => {
    const v = Number(form.discountValue)
    const min = Number(form.minOrderValue)
    if (!v || PREVIEW_AMOUNT < min) return null
    const reduced = calcDiscountAmount({
      discountType: form.discountType,
      discountValue: v,
      maxDiscount: Number(form.maxDiscount) || null,
    }, PREVIEW_AMOUNT)
    return { reduced, final: PREVIEW_AMOUNT - reduced }
  }, [form.discountType, form.discountValue, form.maxDiscount, form.minOrderValue])
  const previewImageUrl = imagePreviewUrl || form.imageUrl

  /* Validate */
  const validate = () => {
    const e = {}
    if (!form.code.trim()) e.code = 'Vui lòng nhập mã'
    if (!/^[A-Z0-9_]{3,30}$/.test(form.code.toUpperCase())) e.code = 'Mã chỉ gồm chữ hoa, số, dấu _ (3-30 ký tự)'
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên'
    if (!imageFile && !form.imageUrl) e.image = 'Vui lòng chọn ảnh khuyến mãi'
    if (!form.discountValue || Number(form.discountValue) <= 0) e.discountValue = 'Giá trị giảm phải > 0'
    if (form.discountType === 'PERCENT' && Number(form.discountValue) > 100) e.discountValue = 'Phần trăm không vượt 100%'
    if (form.minOrderValue !== '' && Number(form.minOrderValue) < 0) e.minOrderValue = 'Không hợp lệ'
    if (!form.startDate) e.startDate = 'Chọn ngày bắt đầu'
    if (!form.endDate)   e.endDate   = 'Chọn ngày kết thúc'
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) e.endDate = 'Ngày kết thúc phải sau ngày bắt đầu'
    if (!form.maxUsage || Number(form.maxUsage) <= 0) e.maxUsage = 'Tổng lượt phải > 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async (activeOverride) => {
    if (!validate()) { toast.error('Vui lòng kiểm tra lại các trường bắt buộc'); return }
    setSaving(true)
    try {
      const imageUrl = imageFile
        ? await promotionService.uploadImage(imageFile)
        : form.imageUrl || null
      if (!imageUrl) throw new Error('Không nhận được đường dẫn ảnh từ Cloudinary')

      const payload = {
        code:          form.code.toUpperCase().trim(),
        name:          form.name.trim(),
        description:   form.description.trim(),
        imageUrl,
        active:        activeOverride ?? form.active,
        discountType:  form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscount:   form.maxDiscount ? Number(form.maxDiscount) : null,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        startDate:     form.startDate || null,
        endDate:       form.endDate   || null,
        weekdays:      form.weekdays,
        applyToMovies: form.applyToMovies,
        applyCinemas:  form.applyCinemas,
        movieIds:      form.applyToMovies === 'SELECTED' ? form.movieIds : [],
        cinemaIds:     form.applyCinemas  === 'SELECTED' ? form.cinemaIds : [],
        maxUsage:      Number(form.maxUsage),
        maxPerUser:    Number(form.maxPerUser) || 1,
        allowStack:    form.allowStack,
        requireLogin:  form.requireLogin,
      }
      if (isEdit) {
        await promotionService.update(id, payload)
        toast.success('Đã lưu thay đổi!')
      } else {
        await promotionService.create(payload)
        toast.success(`Đã tạo khuyến mãi ${payload.code}!`)
      }
      navigate('/admin/promotions')
    } catch (err) {
      toast.error(err.message || 'Lưu thất bại. Vui lòng thử lại.')
    } finally { setSaving(false) }
  }

  if (loadingEdit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#94a3b8' }}>
        <Loader2 size={22} style={{ animation: 'pf-spin 1s linear infinite' }} />
        <span>Đang tải dữ liệu...</span>
        <style>{`@keyframes pf-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <style>{`
        .pf-in:focus { border-color:rgba(225,29,72,.5)!important;box-shadow:0 0 0 3px rgba(225,29,72,.12)!important;outline:none; }
        .pf-toggle{position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;}
        .pf-toggle input{opacity:0;width:0;height:0;}
        .pf-slider{position:absolute;inset:0;background:rgba(255,255,255,.1);border-radius:11px;transition:.2s;}
        .pf-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;}
        input:checked+.pf-slider{background:#e11d48;}
        input:checked+.pf-slider:before{transform:translateX(18px);}
        .pf-wd{padding:6px 12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;background:rgba(255,255,255,.04);color:#94a3b8;transition:all .15s;}
        .pf-wd.active{background:rgba(225,29,72,.15);border-color:rgba(225,29,72,.4);color:#f87171;}
        .pf-type{flex:1;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:all .15s;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#94a3b8;}
        .pf-type.active{border-color:rgba(124,58,237,.5);background:rgba(124,58,237,.15);color:#a78bfa;}
        .pf-editor .ck.ck-editor{border-radius:8px;overflow:hidden;}
        .pf-editor .ck.ck-toolbar{background:#111827;border-color:rgba(255,255,255,.12);}
        .pf-editor .ck.ck-toolbar .ck-button{color:#cbd5e1;}
        .pf-editor .ck.ck-toolbar .ck-button:hover,
        .pf-editor .ck.ck-toolbar .ck-button.ck-on{background:rgba(225,29,72,.18);color:#fda4af;}
        .pf-editor .ck.ck-editor__main>.ck-editor__editable{min-height:180px;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:#e2e8f0;}
        .pf-editor .ck.ck-editor__main>.ck-editor__editable.ck-focused{border-color:rgba(225,29,72,.5);box-shadow:0 0 0 3px rgba(225,29,72,.12);}
        .pf-editor .ck-content a{color:#60a5fa;}
        .pf-editor .ck-content blockquote{border-left-color:#e11d48;color:#cbd5e1;}
        @keyframes pf-spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/promotions')} style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BadgePercent size={20} color="#e11d48" />
            {isEdit ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
          </h1>
          {isEdit && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Đang chỉnh sửa: <span style={{ fontWeight: 700, color: '#94a3b8' }}>{form.code}</span></p>}
        </div>
      </div>

      {/* Active warning */}
      {showActiveWarn && (
        <div style={{ display: 'flex', gap: 10, background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.25)', borderRadius: 10, padding: '13px 16px', marginBottom: 18 }}>
          <AlertTriangle size={17} color="#eab308" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 700, color: '#fbbf24', fontSize: 13 }}>Khuyến mãi đang hoạt động</p>
            <p style={{ color: '#92400e', fontSize: 12, marginTop: 2 }}>Thay đổi sẽ áp dụng ngay. Vui lòng kiểm tra kỹ trước khi lưu.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'flex-start' }}>

        {/* Left form */}
        <div>
          {/* Thông tin cơ bản */}
          <Section icon={Tag} title="Thông tin cơ bản" color="#e11d48">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Tên chương trình" required error={errors.name}>
                  <input className="pf-in" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="VD: Giảm 20% dịp hè 2026" style={inp(!!errors.name)} />
                </Field>
              </div>
              <Field label="Mã khuyến mãi" required error={errors.code} hint="Chỉ dùng chữ hoa, số, dấu _ (3-30 ký tự)">
                <div style={{ display: 'flex', gap: 7 }}>
                  <input className="pf-in" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="VD: SUMMER2026" style={{ ...inp(!!errors.code), flex: 1 }} />
                  <button type="button" onClick={() => set('code', genCode())} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '0 11px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <Zap size={12} /> Tự tạo
                  </button>
                </div>
              </Field>
              <Field label="Trạng thái">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', background: 'rgba(255,255,255,.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)' }}>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{form.active ? 'Đang hoạt động' : 'Tắt'}</span>
                  <label className="pf-toggle">
                    <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                    <span className="pf-slider" />
                  </label>
                </div>
              </Field>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Mô tả" hint="Có thể định dạng tiêu đề, chữ đậm/nghiêng, danh sách, liên kết và trích dẫn.">
                  <div className="pf-editor">
                    <CKEditor
                      editor={ClassicEditor}
                      data={form.description}
                      config={{
                        licenseKey: 'GPL',
                        plugins: [
                          Essentials, Paragraph, Heading, Bold, Italic, Underline,
                          LinkPlugin, List, BlockQuote, Alignment,
                        ],
                        toolbar: [
                          'undo', 'redo', '|', 'heading', '|',
                          'bold', 'italic', 'underline', 'link', '|',
                          'bulletedList', 'numberedList', 'blockQuote', '|', 'alignment',
                        ],
                        placeholder: 'Mô tả chi tiết về chương trình khuyến mãi...',
                      }}
                      onChange={(_, editor) => set('description', editor.getData())}
                    />
                  </div>
                </Field>
              </div>
            </div>
          </Section>

          {/* Ảnh khuyến mãi */}
          <Section icon={ImageIcon} title="Ảnh khuyến mãi" color="#ec4899">
            <Field
              label="Tệp ảnh"
              required
              error={errors.image}
              hint="Ảnh sẽ được tải lên Cloudinary khi bạn lưu. Hỗ trợ JPG, PNG, WebP; tối đa 10 MB."
            >
              <label style={{ aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: `2px dashed ${errors.image ? 'rgba(239,68,68,.55)' : 'rgba(255,255,255,.12)'}`, background: 'rgba(255,255,255,.025)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                {previewImageUrl && !imagePreviewFailed ? (
                  <img
                    src={previewImageUrl}
                    alt="Xem trước ảnh khuyến mãi"
                    onError={() => setImagePreviewFailed(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: imagePreviewFailed ? '#f87171' : '#64748b', fontSize: 12 }}>
                    {imagePreviewFailed ? <ImageIcon size={30} /> : <Upload size={30} />}
                    <span>{imagePreviewFailed ? 'Không thể hiển thị ảnh hiện tại' : 'Nhấn để chọn ảnh khuyến mãi'}</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                />
              </label>
            </Field>
            {previewImageUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -7 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#64748b' }}>
                  {imageFile ? imageFile.name : 'Ảnh hiện tại trên Cloudinary'}
                </span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#fda4af', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <Upload size={11} /> Thay ảnh
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                <button type="button" onClick={removeImage} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  <X size={11} /> Xóa
                </button>
              </div>
            )}
          </Section>

          {/* Giá trị ưu đãi */}
          <Section icon={BadgePercent} title="Giá trị ưu đãi" color="#7c3aed">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Loại giảm giá" required>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ v: 'PERCENT', l: '% Phần trăm' }, { v: 'FIXED', l: '₫ Số tiền cố định' }].map(({ v, l }) => (
                      <button key={v} type="button" className={`pf-type${form.discountType === v ? ' active' : ''}`} onClick={() => set('discountType', v)}>{l}</button>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label={form.discountType === 'PERCENT' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (₫)'} required error={errors.discountValue}>
                <input className="pf-in" type="number" min="0" value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} placeholder={form.discountType === 'PERCENT' ? 'VD: 20' : 'VD: 50000'} style={inp(!!errors.discountValue)} />
              </Field>
              {form.discountType === 'PERCENT' && (
                <Field label="Giảm tối đa (₫)" hint="Bỏ trống = không giới hạn">
                  <input className="pf-in" type="number" min="0" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="VD: 100000" style={inp(false)} />
                </Field>
              )}
              <Field label="Đơn hàng tối thiểu (₫)" error={errors.minOrderValue}>
                <input className="pf-in" type="number" min="0" value={form.minOrderValue} onChange={(e) => set('minOrderValue', e.target.value)} placeholder="VD: 200000" style={inp(!!errors.minOrderValue)} />
              </Field>
            </div>
          </Section>

          {/* Thời gian */}
          <Section icon={Calendar} title="Thời gian áp dụng" color="#0ea5e9">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Ngày giờ bắt đầu (giờ Việt Nam)" required error={errors.startDate}>
                <input className="pf-in" type="datetime-local" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} style={{ ...inp(!!errors.startDate), colorScheme: 'dark' }} />
              </Field>
              <Field label="Ngày giờ kết thúc (giờ Việt Nam)" required error={errors.endDate}>
                <input className="pf-in" type="datetime-local" value={form.endDate} min={form.startDate} onChange={(e) => set('endDate', e.target.value)} style={{ ...inp(!!errors.endDate), colorScheme: 'dark' }} />
              </Field>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Chỉ áp dụng các ngày trong tuần" hint="Bỏ trống = áp dụng mọi ngày">
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
                    {WEEKDAY_LABELS.map((d, i) => (
                      <button
                        key={i} type="button"
                        className={`pf-wd${form.weekdays.includes(i) ? ' active' : ''}`}
                        onClick={() => { const w = form.weekdays.includes(i) ? form.weekdays.filter((x) => x !== i) : [...form.weekdays, i]; set('weekdays', w) }}
                      >{d}</button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </Section>

          {/* Phạm vi áp dụng */}
          <Section icon={MapPin} title="Phạm vi áp dụng" color="#22c55e" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Field label="Áp dụng cho rạp">
                  <select className="pf-in" value={form.applyCinemas} onChange={(e) => set('applyCinemas', e.target.value)} style={sel(false)}>
                    <option value="ALL">Tất cả rạp</option>
                    <option value="SELECTED">Chọn rạp cụ thể</option>
                  </select>
                </Field>
                {form.applyCinemas === 'SELECTED' && (
                  <Field label="Rạp được chọn">
                    <MultiSelect items={cinemas} selected={form.cinemaIds} onChange={(v) => set('cinemaIds', v)} placeholder="Chọn rạp..." />
                  </Field>
                )}
              </div>
              <div>
                <Field label="Áp dụng cho phim">
                  <select className="pf-in" value={form.applyToMovies} onChange={(e) => set('applyToMovies', e.target.value)} style={sel(false)}>
                    <option value="ALL">Tất cả phim</option>
                    <option value="SELECTED">Chọn phim cụ thể</option>
                  </select>
                </Field>
                {form.applyToMovies === 'SELECTED' && (
                  <Field label="Phim được chọn">
                    <MultiSelect items={movies} selected={form.movieIds} onChange={(v) => set('movieIds', v)} placeholder="Chọn phim..." />
                  </Field>
                )}
              </div>
            </div>
          </Section>

          {/* Giới hạn sử dụng */}
          <Section icon={Users} title="Giới hạn sử dụng" color="#f97316" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Tổng lượt sử dụng" required error={errors.maxUsage}>
                <input className="pf-in" type="number" min="1" value={form.maxUsage} onChange={(e) => set('maxUsage', e.target.value)} placeholder="VD: 500" style={inp(!!errors.maxUsage)} />
              </Field>
              <Field label="Tối đa / tài khoản">
                <input className="pf-in" type="number" min="1" value={form.maxPerUser} onChange={(e) => set('maxPerUser', Number(e.target.value))} placeholder="VD: 1" style={inp(false)} />
              </Field>
              {[
                { key: 'allowStack',    label: 'Cho phép cộng dồn ưu đãi' },
                { key: 'requireLogin',  label: 'Yêu cầu đăng nhập' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', background: 'rgba(255,255,255,.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)' }}>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{label}</span>
                  <label className="pf-toggle">
                    <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
                    <span className="pf-slider" />
                  </label>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Right: Preview + Actions */}
        <div style={{ position: 'sticky', top: 24 }}>
          {/* Discount preview */}
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={13} /> Xem trước hiệu ứng
            </h3>
            {previewImageUrl && !imagePreviewFailed && (
              <img
                src={previewImageUrl}
                alt={form.name || 'Ảnh khuyến mãi'}
                onError={() => setImagePreviewFailed(true)}
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 10, border: '1px solid rgba(255,255,255,.08)' }}
              />
            )}
            <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '11px 14px', fontSize: 12, marginBottom: 10 }}>
              <div style={{ color: '#64748b', marginBottom: 6 }}>Đơn minh họa: <strong style={{ color: '#f1f5f9' }}>{fmtVND(PREVIEW_AMOUNT)}</strong></div>
              {PREVIEW_AMOUNT < Number(form.minOrderValue) && form.minOrderValue && (
                <div style={{ color: '#f97316', background: 'rgba(249,115,22,.1)', borderRadius: 6, padding: '5px 9px', marginTop: 6, fontSize: 11 }}>⚠ Đơn chưa đạt tối thiểu {fmtVND(Number(form.minOrderValue))}</div>
              )}
              {previewDiscount && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 8, paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Giảm giá</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>-{fmtVND(previewDiscount.reduced)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Còn lại</span>
                    <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15 }}>{fmtVND(previewDiscount.final)}</span>
                  </div>
                </div>
              )}
              {!previewDiscount && !form.discountValue && (
                <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>Nhập giá trị giảm để xem trước...</div>
              )}
            </div>
            {form.code && (
              <div style={{ background: 'rgba(225,29,72,.08)', border: '1px dashed rgba(225,29,72,.3)', borderRadius: 8, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Tag size={13} color="#ef4444" />
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f87171', fontSize: 14, letterSpacing: 2 }}>{form.code}</span>
              </div>
            )}
          </div>

          {/* Validation errors summary */}
          {Object.keys(errors).length > 0 && (
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '11px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontWeight: 700, color: '#ef4444', fontSize: 12 }}>
                <AlertTriangle size={13} /> {Object.keys(errors).length} lỗi cần sửa
              </div>
              {Object.values(errors).map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: '#fca5a5', marginBottom: 1 }}>• {e}</div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button type="button" disabled={saving} onClick={() => handleSave(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: '11px 22px', background: saving ? 'rgba(225,29,72,.4)' : 'linear-gradient(135deg,#e11d48,#be123c)', color: '#fff', boxShadow: saving ? 'none' : '0 4px 20px rgba(225,29,72,.4)', opacity: saving ? .7 : 1 }}>
              {saving ? <><Loader2 size={14} style={{ animation: 'pf-spin 1s linear infinite' }} /> Đang lưu...</> : <><Save size={14} /> {isEdit ? 'Lưu thay đổi' : 'Tạo & Bật ngay'}</>}
            </button>
            {!isEdit && (
              <button type="button" disabled={saving} onClick={() => handleSave(false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: '11px 22px', background: 'rgba(255,255,255,.05)', color: '#94a3b8' }}>
                <Save size={14} /> Lưu bản nháp (Tắt)
              </button>
            )}
            <button type="button" onClick={() => navigate('/admin/promotions')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: '10px 22px', background: 'none', color: '#64748b' }}>
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
