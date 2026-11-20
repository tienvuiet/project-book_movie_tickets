import {
  ArrowLeft, BadgePercent, Calendar, CheckCircle2, Clock, Edit3,
  Loader2, Pause, Play, RefreshCw, Tag, TrendingUp, Users, XCircle, AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import ModalConfirm from '../../components/ModalConfirm'
import promotionService, { fmtVND } from '../../services/promotionService'

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
// fmtDate removed — use fmtDTime for full date display
const fmtDTime = (s) => s ? new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtNum   = (n) => Number(n || 0).toLocaleString('vi-VN')
const money    = (n) => fmtVND(n)
const pct      = (a, b) => (b ? ((a / b) * 100).toFixed(1) : '0') + '%'

const STATUS_CFG = {
  ACTIVE:        { label: 'Hoạt động',   color: '#22c55e', bg: 'rgba(34,197,94,.15)'  },
  INACTIVE:      { label: 'Đã tắt',      color: '#94a3b8', bg: 'rgba(148,163,184,.1)' },
  EXPIRED:       { label: 'Hết hạn',     color: '#ef4444', bg: 'rgba(239,68,68,.15)'  },
  EXPIRING_SOON: { label: 'Sắp hết hạn', color: '#f97316', bg: 'rgba(249,115,22,.15)' },
}

/* ─── Stat Card ─────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = '#e11d48' }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <div style={{ width: 40, height: 40, borderRadius: 9, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.15 }}>{value}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color, marginTop: 3, fontWeight: 600 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

/* ─── Info Row ──────────────────────────────────────────────────────────────── */
function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <span style={{ fontSize: 12, color: '#64748b', minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

/* ─── Status badge in table ─────────────────────────────────────────────────── */
const BOOKING_STATUS = {
  PENDING: { label: 'Chờ', color: '#fbbf24', bg: 'rgba(251,191,36,.1)' },
  PAID:    { label: 'Đã dùng', color: '#22c55e', bg: 'rgba(34,197,94,.1)' },
  CANCELLED:{ label: 'Hoàn', color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
  EXPIRED: { label: 'Hết hạn', color: '#94a3b8', bg: 'rgba(148,163,184,.1)' },
}

/* ─── Custom Tooltip ────────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {fmtNum(p.value)}</p>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
/* Mạng mock cho biểu đồ — tạo 1 lần khi module load, không phải trong render */
const MOCK_CHART_DATA = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - 13 + i)
  return { date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), used: Math.floor(Math.random() * 30) }
})

export default function PromotionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [promo, setPromo]     = useState(null)
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        promotionService.getById(id),
        promotionService.getStats(id),
      ])
      setImageFailed(false)
      setPromo(p)
      setStats(s)
    } catch (err) {
      toast.error(err.message || 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleToggle = async () => {
    setToggling(true)
    try {
      await promotionService.toggleActive(id, !(promo.active || promo.status === 'ACTIVE'))
      toast.success('Đã cập nhật trạng thái')
      setConfirm(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Cập nhật thất bại')
    } finally {
      setToggling(false) }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#94a3b8' }}>
        <Loader2 size={22} style={{ animation: 'pd-spin 1s linear infinite' }} />
        <span>Đang tải...</span>
        <style>{`@keyframes pd-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!promo) {
    return (
      <div style={{ padding: 32, color: '#ef4444', textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ opacity: .4, margin: '0 auto 10px' }} />
        <p>Không tìm thấy khuyến mãi.</p>
        <Link to="/admin/promotions" style={{ color: '#e11d48', fontSize: 13 }}>← Quay lại</Link>
      </div>
    )
  }

  const isActive   = promo.active || promo.status === 'ACTIVE'
  const statusKey  = promo.status ?? (isActive ? 'ACTIVE' : 'INACTIVE')
  const sCfg       = STATUS_CFG[statusKey] ?? STATUS_CFG.INACTIVE
  const totalUsed  = stats?.totalUsed  ?? promo.usedCount ?? 0
  const holdCount  = stats?.holdCount  ?? promo.holdCount ?? 0
  const refunded   = stats?.refundedCount ?? 0
  const totalSaved = stats?.totalDiscount ?? promo.totalDiscount ?? 0
  const successRate= stats?.successRate ?? (totalUsed ? pct(totalUsed - refunded, totalUsed) : '—')

  // Mocked daily chart data (sẽ được thay bằng stats.dailyUsage khi BE trả về)
  const chartData = stats?.dailyUsage ?? MOCK_CHART_DATA

  // Recent usage table
  const recentUsage = stats?.recentUsage ?? []

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <style>{`@keyframes pd-spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/admin/promotions')} style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace', letterSpacing: 2 }}>{promo.code}</h1>
              <span style={{ background: sCfg.bg, color: sCfg.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sCfg.color }} />
                {sCfg.label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{promo.name}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setConfirm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: isActive ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)', color: isActive ? '#ef4444' : '#22c55e', border: `1px solid ${isActive ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)'}`, borderRadius: 9, padding: '9px 15px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            {isActive ? <Pause size={14} /> : <Play size={14} />}
            {isActive ? 'Tắt' : 'Bật'}
          </button>
          <Link to={`/admin/promotions/${id}/edit`}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '9px 15px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <Edit3 size={14} /> Sửa
            </button>
          </Link>
        </div>
      </div>

      {promo.imageUrl && !imageFailed && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '21/6', minHeight: 180, maxHeight: 320, overflow: 'hidden', borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', marginBottom: 24, background: '#1e293b' }}>
          <img
            src={promo.imageUrl}
            alt={promo.name || `Khuyến mãi ${promo.code}`}
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(15,23,42,.75),transparent 55%,rgba(15,23,42,.15))' }} />
          <div style={{ position: 'absolute', left: 24, bottom: 20, maxWidth: '55%' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 2, color: '#fda4af', fontWeight: 800 }}>{promo.code}</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginTop: 4, textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>{promo.name}</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon={Clock}         label="Đang giữ"       value={fmtNum(holdCount)}   color="#fbbf24" />
        <StatCard icon={CheckCircle2}  label="Đã sử dụng"     value={fmtNum(totalUsed)}   color="#22c55e" />
        <StatCard icon={XCircle}       label="Đã hoàn"        value={fmtNum(refunded)}    color="#ef4444" />
        <StatCard icon={BadgePercent}  label="Tổng tiền giảm" value={money(totalSaved)}   color="#7c3aed" />
        <StatCard icon={TrendingUp}    label="Tỷ lệ thành công" value={successRate}        color="#0ea5e9" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18, alignItems: 'flex-start' }}>
        {/* Left */}
        <div>
          {/* Chart */}
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '20px 22px', marginBottom: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <TrendingUp size={14} color="#e11d48" /> Lượt sử dụng theo ngày (14 ngày gần nhất)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="used" name="Lượt dùng" stroke="#e11d48" strokeWidth={2} dot={{ fill: '#e11d48', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent usage table */}
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={14} color="#7c3aed" /> Lịch sử sử dụng gần đây
              </h3>
              <button onClick={load} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 7, padding: '5px 9px', cursor: 'pointer', color: '#94a3b8' }}>
                <RefreshCw size={13} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {recentUsage.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                  Chưa có lịch sử sử dụng
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                      {['Khách hàng', 'Mã vé', 'Thời gian', 'Tiền giảm', 'Trạng thái'].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsage.map((u, i) => {
                      const sc = BOOKING_STATUS[u.bookingStatus] ?? BOOKING_STATUS.PAID
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <td style={{ padding: '11px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{u.customerName}</div>
                            <div style={{ color: '#475569', marginTop: 1 }}>{u.customerEmail}</div>
                          </td>
                          <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: '#94a3b8', fontWeight: 600 }}>{u.bookingCode}</td>
                          <td style={{ padding: '11px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDTime(u.usedAt)}</td>
                          <td style={{ padding: '11px 16px', color: '#34d399', fontWeight: 700 }}>{money(u.discountAmount)}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{sc.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right: Info panel */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '18px 20px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.06em' }}>Thông tin cấu hình</h3>

          <InfoRow label="Loại giảm" value={promo.discountType === 'PERCENT' ? 'Phần trăm (%)' : 'Cố định (₫)'} />
          <InfoRow label="Giá trị giảm"
            value={promo.discountType === 'PERCENT'
              ? `${promo.discountValue}%${promo.maxDiscount ? ` (≤${money(promo.maxDiscount)})` : ''}`
              : money(promo.discountValue)} />
          <InfoRow label="Đơn tối thiểu" value={money(promo.minOrderValue)} />
          <InfoRow label="Ngày bắt đầu"  value={fmtDTime(promo.startDate)} />
          <InfoRow label="Ngày kết thúc"  value={fmtDTime(promo.endDate)} />
          {promo.weekdays?.length > 0 && (
            <InfoRow label="Ngày trong tuần" value={promo.weekdays.map((d) => ['CN','T2','T3','T4','T5','T6','T7'][d]).join(', ')} />
          )}
          <InfoRow label="Tổng lượt giới hạn" value={promo.maxUsage ? fmtNum(promo.maxUsage) : 'Không giới hạn'} />
          <InfoRow label="Tối đa / tài khoản" value={promo.maxPerUser ? fmtNum(promo.maxPerUser) : '—'} />
          <InfoRow label="Phạm vi rạp"
            value={promo.applyCinemas === 'ALL' ? 'Tất cả rạp' : `${promo.cinemaIds?.length ?? 0} rạp`} />
          <InfoRow label="Phạm vi phim"
            value={promo.applyToMovies === 'ALL' ? 'Tất cả phim' : `${promo.movieIds?.length ?? 0} phim`} />
          <InfoRow label="Yêu cầu đăng nhập" value={promo.requireLogin ? 'Có' : 'Không'} />
          <InfoRow label="Cộng dồn ưu đãi"   value={promo.allowStack  ? 'Có' : 'Không'} />
          {promo.createdBy && <InfoRow label="Tạo bởi" value={promo.createdBy} />}
          {promo.createdAt && <InfoRow label="Ngày tạo" value={fmtDTime(promo.createdAt)} />}

          {/* Progress bar */}
          {promo.maxUsage > 0 && (
            <div style={{ marginTop: 16, padding: '13px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: '#94a3b8' }}>Đã dùng</span>
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{fmtNum(totalUsed)} / {fmtNum(promo.maxUsage)}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min(100, totalUsed / promo.maxUsage * 100)}%`,
                  background: totalUsed / promo.maxUsage > 0.9 ? '#ef4444' : totalUsed / promo.maxUsage > 0.7 ? '#f97316' : '#22c55e',
                  transition: 'width .5s',
                }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#64748b', textAlign: 'right' }}>
                Còn {fmtNum(Math.max(0, promo.maxUsage - totalUsed))} lượt
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm toggle */}
      <ModalConfirm
        open={confirm}
        title={isActive ? 'Tắt khuyến mãi?' : 'Bật khuyến mãi?'}
        message={isActive
          ? `Khuyến mãi "${promo.code}" sẽ bị tắt. Khách hàng không thể sử dụng cho đến khi bật lại.`
          : `Khuyến mãi "${promo.code}" sẽ được bật và áp dụng ngay.`}
        confirmLabel={isActive ? 'Tắt' : 'Bật'}
        onConfirm={handleToggle}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
