import {
  BadgePercent, ChevronLeft, ChevronRight, Clock, Edit3, Eye,
  ImageIcon, Pause, Play, Plus, RefreshCw, Search, TrendingUp, X, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import ModalConfirm from '../../components/ModalConfirm'
import promotionService, { fmtVND } from '../../services/promotionService'

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtNum = (value) => {
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value).toLocaleString('vi-VN')
  return Number(value || 0).toLocaleString('vi-VN')
}

/* ─── Status Badge ──────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  ACTIVE:        { label: 'Hoạt động',   color: '#22c55e', bg: 'rgba(34,197,94,.15)',   border: 'rgba(34,197,94,.3)' },
  INACTIVE:      { label: 'Tắt',         color: '#94a3b8', bg: 'rgba(148,163,184,.12)', border: 'rgba(148,163,184,.25)' },
  EXPIRED:       { label: 'Hết hạn',     color: '#ef4444', bg: 'rgba(239,68,68,.15)',   border: 'rgba(239,68,68,.3)' },
  SCHEDULED:     { label: 'Sắp diễn ra', color: '#38bdf8', bg: 'rgba(56,189,248,.15)',  border: 'rgba(56,189,248,.3)' },
  EXPIRING_SOON: { label: 'Sắp hết hạn', color: '#f97316', bg: 'rgba(249,115,22,.15)', border: 'rgba(249,115,22,.3)' },
}

function StatusBadge({ active, status }) {
  const key = status ?? (active ? 'ACTIVE' : 'INACTIVE')
  const cfg = STATUS_CFG[key] ?? STATUS_CFG.INACTIVE
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

/* ─── Stat Card ─────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = '#e11d48' }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={19} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )
}

function PromotionThumbnail({ src, name }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  return (
    <div style={{ width: 54, height: 38, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src && !failed
        ? <img src={src} alt={name || 'Ảnh khuyến mãi'} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <ImageIcon size={15} color="#64748b" />}
    </div>
  )
}

/* ─── Skeleton Row ──────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[120, 180, 100, 90, 110, 130, 90, 90, 100].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div style={{ height: 13, width: w, borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'pm-pulse 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

/* ─── Selects common style ──────────────────────────────────────────────────── */
const selStyle = {
  background: '#0f172a', color: '#cbd5e1', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', cursor: 'pointer',
}

const STATUS_OPTS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE',        label: 'Đang hoạt động' },
  { value: 'INACTIVE',      label: 'Đã tắt' },
  { value: 'SCHEDULED',     label: 'Sắp diễn ra' },
  { value: 'EXPIRED',       label: 'Hết hạn' },
  { value: 'EXPIRING_SOON', label: 'Sắp hết hạn' },
]
const TYPE_OPTS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'PERCENT', label: 'Phần trăm (%)' },
  { value: 'FIXED',   label: 'Cố định (₫)' },
]
const PAGE_SIZES = [10, 20, 50]

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function PromotionManagementPage() {
  const navigate = useNavigate()

  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [typeFilter, setType]       = useState('')
  const [page, setPage]             = useState(0)
  const [pageSize, setPageSize]     = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [confirm, setConfirm]       = useState(null) // { promo, nextActive }
  const [summary, setSummary]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await promotionService.getAll({
      page, size: pageSize,
      search: query.trim() || undefined,
      status: statusFilter || undefined,
      discountType: typeFilter || undefined,
    })
    setRows(result.content ?? [])
    setTotalPages(result.totalPages ?? 1)
    setTotalItems(result.totalElements ?? result.content?.length ?? 0)
    setLoading(false)
  }, [page, pageSize, query, statusFilter, typeFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let cancelled = false
    promotionService.getSummary()
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch(() => { /* Giữ dấu — khi backend summary chưa sẵn sàng. */ })
    return () => { cancelled = true }
  }, [])

  /* Trạng thái tạm tính cho trang hiện tại; số sử dụng và tiền giảm lấy từ backend summary. */
  const stats = useMemo(() => ({
    active:       rows.filter((r) => Boolean(r.active)).length,
    expiring:     rows.filter((r) => r.status === 'EXPIRING_SOON').length,
  }), [rows])

  const resetFilters = () => { setQuery(''); setStatus(''); setType(''); setPage(0) }

  const handleToggle = (promo) =>
    setConfirm({ promo, nextActive: !promo.active })

  const confirmToggle = async () => {
    const { promo, nextActive } = confirm
    try {
      await promotionService.toggleActive(promo.id, nextActive)
      toast.success(nextActive ? `Đã bật khuyến mãi ${promo.code}` : `Đã tắt khuyến mãi ${promo.code}`)
      setConfirm(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Không thể thay đổi trạng thái')
      setConfirm(null)
    }
  }

  const colNames = ['Mã', 'Tên chương trình', 'Loại giảm', 'Giá trị', 'Đơn tối thiểu', 'Hiệu lực', 'Lượt dùng', 'Trạng thái', 'Thao tác']

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <style>{`
        @keyframes pm-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .pm-row:hover td { background: rgba(255,255,255,.02); }
        .pm-btn { display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:none;cursor:pointer;background:rgba(255,255,255,.06);color:#94a3b8;transition:all .15s; }
        .pm-btn:hover { background:rgba(255,255,255,.12);color:#f1f5f9; }
        .pm-btn.danger:hover { background:rgba(239,68,68,.15);color:#ef4444; }
        .pm-btn.success:hover { background:rgba(34,197,94,.15);color:#22c55e; }
        .pm-pg { background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:8px;color:#94a3b8;padding:6px 12px;cursor:pointer;font-size:13px;transition:all .15s; }
        .pm-pg:hover { background:rgba(255,255,255,.1);color:#f1f5f9; }
        .pm-pg.active { background:#e11d48;border-color:#e11d48;color:#fff;font-weight:700; }
        .pm-pg:disabled { opacity:.4;cursor:not-allowed; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BadgePercent size={24} color="#e11d48" /> Quản lý Khuyến mãi
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Tạo và quản lý mã khuyến mãi cho hệ thống đặt vé.</p>
        </div>
        <button
          onClick={() => navigate('/admin/promotions/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#e11d48,#be123c)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(225,29,72,.4)' }}
        >
          <Plus size={16} /> Tạo khuyến mãi
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard icon={BadgePercent} label="Tổng số"          value={fmtNum(totalItems)}             color="#e11d48" />
        <StatCard icon={CheckCircle2} label="Đang bật"         value={fmtNum(stats.active)}           color="#22c55e" />
        <StatCard icon={Clock}        label="Sắp hết hạn"      value={fmtNum(stats.expiring)}         color="#f97316" />
        <StatCard icon={TrendingUp}   label="Tổng lượt dùng"   value={summary ? fmtNum(summary.totalUsed) : '—'} sub="Đơn đã thanh toán" color="#7c3aed" />
        <StatCard icon={BadgePercent} label="Tổng tiền giảm"   value={summary ? fmtVND(summary.totalDiscount) : '—'} sub="Toàn hệ thống" color="#0ea5e9" />
      </div>

      {/* Toolbar */}
      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              placeholder="Tìm mã hoặc tên..."
              style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13, outline: 'none' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={12} />
              </button>
            )}
          </div>
          <select value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(0) }} style={selStyle}>
            {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setType(e.target.value); setPage(0) }} style={selStyle}>
            {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(query || statusFilter || typeFilter) && (
            <button onClick={resetFilters} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '8px 13px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              <RefreshCw size={12} /> Đặt lại
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{fmtNum(totalItems)} kết quả</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {colNames.map((h) => (
                  <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : rows.length === 0
                  ? (
                    <tr><td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <BadgePercent size={38} style={{ opacity: .2 }} />
                        <p style={{ color: '#64748b' }}>Không tìm thấy khuyến mãi nào</p>
                        {(query || statusFilter || typeFilter) && (
                          <button onClick={resetFilters} style={{ color: '#e11d48', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Xóa bộ lọc</button>
                        )}
                      </div>
                    </td></tr>
                  )
                  : rows.map((p) => {
                    const isActive = Boolean(p.active)
                    const maxUse   = p.maxUsage ?? 9999
                    const used     = p.usedCount ?? 0
                    const usePct   = maxUse ? Math.min(100, used / maxUse * 100) : 0
                    const barColor = usePct > 90 ? '#ef4444' : usePct > 70 ? '#f97316' : '#22c55e'
                    return (
                      <tr key={p.id} className="pm-row" style={{ borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s' }}>
                        {/* Mã */}
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f9', background: 'rgba(225,29,72,.1)', border: '1px solid rgba(225,29,72,.2)', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}>
                            {p.code}
                          </span>
                        </td>
                        {/* Tên */}
                        <td style={{ padding: '13px 16px', maxWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <PromotionThumbnail src={p.imageUrl} name={p.name} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                              {p.description && <div style={{ fontSize: 11, color: '#475569', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                            </div>
                          </div>
                        </td>
                        {/* Loại */}
                        <td style={{ padding: '13px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {p.discountType === 'PERCENT' ? '% Phần trăm' : '₫ Cố định'}
                        </td>
                        {/* Giá trị */}
                        <td style={{ padding: '13px 16px', fontWeight: 700, color: '#fbbf24', whiteSpace: 'nowrap' }}>
                          {p.discountType === 'PERCENT'
                            ? `${p.discountValue}%${p.maxDiscount ? ` (≤${fmtVND(p.maxDiscount)})` : ''}`
                            : fmtVND(p.discountValue)}
                        </td>
                        {/* Đơn tối thiểu */}
                        <td style={{ padding: '13px 16px', color: '#94a3b8' }}>{fmtVND(p.minOrderValue)}</td>
                        {/* Hiệu lực */}
                        <td style={{ padding: '13px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 12 }}>{fmtDate(p.startDate)}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>→ {fmtDate(p.endDate)}</div>
                        </td>
                        {/* Lượt dùng */}
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4, fontSize: 12 }}>
                            {fmtNum(used)}{maxUse !== Infinity ? `/${fmtNum(maxUse)}` : ''}
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 4, width: 80 }}>
                            <div style={{ height: '100%', borderRadius: 4, width: `${usePct}%`, background: barColor }} />
                          </div>
                        </td>
                        {/* Trạng thái */}
                        <td style={{ padding: '13px 16px' }}>
                          <StatusBadge active={p.active} status={p.status} />
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Link to={`/admin/promotions/${p.id}`}>
                              <button className="pm-btn" title="Xem chi tiết"><Eye size={13} /></button>
                            </Link>
                            <Link to={`/admin/promotions/${p.id}/edit`}>
                              <button className="pm-btn" title="Chỉnh sửa"><Edit3 size={13} /></button>
                            </Link>
                            <button
                              className={`pm-btn ${isActive ? 'danger' : 'success'}`}
                              title={isActive ? 'Tắt khuyến mãi' : 'Bật khuyến mãi'}
                              onClick={() => handleToggle(p)}
                            >
                              {isActive ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalItems > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            Hiển thị
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} style={{ ...selStyle, padding: '5px 8px' }}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            dòng &nbsp;·&nbsp; {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} / {fmtNum(totalItems)}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="pm-pg" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : page < 4 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i
              return (
                <button key={p} className={`pm-pg${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p + 1}</button>
              )
            })}
            <button className="pm-pg" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ModalConfirm
          open
          title={confirm.nextActive ? 'Bật khuyến mãi?' : 'Tắt khuyến mãi?'}
          message={confirm.nextActive
            ? `Khuyến mãi "${confirm.promo.code}" sẽ được bật và áp dụng ngay cho khách hàng.`
            : `Khuyến mãi "${confirm.promo.code}" sẽ bị tắt. Khách hàng không thể sử dụng cho đến khi bật lại.`}
          confirmLabel={confirm.nextActive ? 'Bật' : 'Tắt'}
          onConfirm={confirmToggle}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
