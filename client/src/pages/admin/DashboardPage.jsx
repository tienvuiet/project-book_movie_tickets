import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, CartesianGrid, Cell, Line, LineChart,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { DollarSign, Film, TrendingUp, Ticket, ExternalLink } from 'lucide-react'
import reportService from '../../services/reportService'
import Loading from '../../components/Loading'

const currency    = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const number      = new Intl.NumberFormat('vi-VN')
const shortDate   = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })

const formatPercent = (value) => {
  const n = Number(value || 0)
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const CINEMA_COLORS = ['#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#f97316', '#eab308']

const renderCustomDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

function StatusBadge({ status }) {
  const map = {
    SUCCESS:   { label: 'Paid',      bg: 'rgba(34,197,94,.15)',   color: '#22c55e' },
    PENDING:   { label: 'Pending',   bg: 'rgba(234,179,8,.15)',   color: '#eab308' },
    FAILED:    { label: 'Failed',    bg: 'rgba(239,68,68,.15)',   color: '#ef4444' },
    CANCELLED: { label: 'Cancelled', bg: 'rgba(100,116,139,.15)', color: '#64748b' },
  }
  const cfg = map[status] || { label: status, bg: 'rgba(100,116,139,.15)', color: '#94a3b8' }
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
    }}>{cfg.label}</span>
  )
}

const ChartTooltip = ({ active, payload, label, fmt = number.format }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 16px' }}>
      <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{fmt(payload[0].value)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [error, setError]         = useState('')

  useEffect(() => {
    let active = true
    reportService.dashboard()
      .then(res => { if (active) setDashboard(res.data || res) })
      .catch(err => { if (active) setError(err.message || 'Không thể tải báo cáo') })
    return () => { active = false }
  }, [])

  const revenue = useMemo(() => (dashboard?.revenue || []).map(item => ({
    ...item,
    name: shortDate.format(new Date(`${item.date}T00:00:00`)),
    value: Number(item.value || 0),
  })), [dashboard])

  if (error)      return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">{error}</div>
  if (!dashboard) return <Loading />

  const data       = dashboard.stats || {}
  const cinemaData = (dashboard.revenueBycinema || []).map(c => ({ name: c.name, value: Number(c.revenue || 0) }))
  const recentTx   = dashboard.recentTransactions || []
  const dashboardMonth = dashboard.period?.from
    ? new Date(`${dashboard.period.from}T00:00:00`).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
    : ''

  const stats = [
    { label: 'Doanh thu tháng',      value: currency.format(data.revenue || 0),             change: data.revenueChangePercent, icon: DollarSign, gradient: 'gradient-brand',  glow: 'shadow-glow-sm'     },
    { label: 'Vé đã bán',            value: number.format(data.ticketsSold || 0),            change: data.ticketsChangePercent, icon: Ticket,     gradient: 'gradient-blue',   glow: 'shadow-glow-blue'   },
    { label: 'Phim đang chiếu',      value: number.format(data.currentlyShowingMovies || 0), change: null,                      icon: Film,       gradient: 'gradient-purple', glow: 'shadow-glow-purple' },
    { label: 'Tăng trưởng doanh thu',value: formatPercent(data.growthPercent),               change: data.growthPercent,        icon: TrendingUp, gradient: 'gradient-accent', glow: 'shadow-glow-accent' },
  ]

  return (
    <section className="space-y-6">

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500/20 via-dark-800/50 to-purple-500/20 p-6 lg:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-purple-500/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white lg:text-3xl">
            Tổng quan kinh doanh{dashboardMonth ? ` tháng ${dashboardMonth}` : ''}
          </h1>
          <p className="mt-2 max-w-lg text-dark-400">
            Dữ liệu thực tế trong tháng{dashboardMonth ? ` ${dashboardMonth}` : ''}, cập nhật đến hôm nay.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-8 right-20 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const positive = Number(stat.change || 0) >= 0
          return (
            <div key={stat.label} className="group relative overflow-hidden rounded-2xl glass p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-dark-400">{stat.label}</p>
                  <p className="mt-2 truncate text-2xl font-bold tracking-tight text-white">{stat.value}</p>
                  {stat.change !== null && (
                    <div className="mt-2 flex items-center gap-1">
                      <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{formatPercent(stat.change)}</span>
                      <span className="text-xs text-dark-500">so với cùng kỳ tháng trước</span>
                    </div>
                  )}
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.gradient} ${stat.glow}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Row 2: Line chart + Top-5 movies horizontal bar ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Line chart */}
        <div className="rounded-2xl glass p-5 animate-slide-up">
          <div className="mb-5">
            <h2 className="font-semibold text-white">Biểu đồ doanh thu tháng</h2>
            <p className="mt-0.5 text-xs text-dark-500">Chỉ tính giao dịch thanh toán thành công</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${number.format(v / 1000000)}tr`} />
              <Tooltip content={<ChartTooltip fmt={currency.format} />} cursor={{ stroke: '#334155' }} />
              <Line dataKey="value" stroke="#ef4444" strokeWidth={3}
                dot={{ r: 4, fill: '#0f172a', stroke: '#ef4444', strokeWidth: 2 }}
                activeDot={{ r: 6 }} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top-5 horizontal bar */}
        <div className="rounded-2xl glass p-5 animate-slide-up">
          <div className="mb-5">
            <h2 className="font-semibold text-white">Top 5 phim bán chạy</h2>
            <p className="mt-0.5 text-xs text-dark-500">Số vé thuộc giao dịch thành công trong tháng</p>
          </div>
          {dashboard.topMovies?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboard.topMovies} barSize={28} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="#475569" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.length > 15 ? v.slice(0, 15) + '…' : v} />
                <Tooltip content={<ChartTooltip fmt={v => `${number.format(v)} vé`} />} cursor={{ fill: 'rgba(30,41,59,0.4)' }} />
                <Bar dataKey="tickets" radius={[0, 8, 8, 0]}>
                  {dashboard.topMovies.map((_, i) => (
                    <Cell key={i} fill={CINEMA_COLORS[i % CINEMA_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-dark-500">Chưa có giao dịch thành công trong tháng này</div>
          )}
        </div>
      </div>

      {/* ── Row 3: Donut + Recent transactions ── */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">

        {/* Donut – doanh thu theo rạp */}
        <div className="rounded-2xl glass p-5 animate-slide-up">
          <div className="mb-3">
            <h2 className="font-semibold text-white">Doanh thu theo rạp</h2>
            <p className="mt-0.5 text-xs text-dark-500">Tỷ trọng tháng hiện tại</p>
          </div>
          {cinemaData.length ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={cinemaData}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomDonutLabel}
                  >
                    {cinemaData.map((_, i) => (
                      <Cell key={i} fill={CINEMA_COLORS[i % CINEMA_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => currency.format(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-2">
                {cinemaData.map((cinema, i) => {
                  const total = cinemaData.reduce((acc, c) => acc + c.value, 0)
                  const pct   = total > 0 ? ((cinema.value / total) * 100).toFixed(1) : '0.0'
                  return (
                    <li key={i} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-dark-300 min-w-0">
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: CINEMA_COLORS[i % CINEMA_COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                        <span className="truncate" title={cinema.name}>{cinema.name}</span>
                      </span>
                      <span className="ml-2 text-xs font-bold text-white shrink-0">{pct}%</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-dark-500">Chưa có dữ liệu</div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="rounded-2xl glass p-5 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Giao dịch gần đây</h2>
              <p className="mt-0.5 text-xs text-dark-500">10 giao dịch mới nhất trong tháng</p>
            </div>
            <a href="/admin/bookings"
              className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">
              Xem tất cả <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.3)' }}>
                  {['Mã vé', 'Khách hàng', 'Rạp', 'Số tiền', 'Trạng thái', 'Thời gian'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 0', textAlign: 'center', color: '#475569', fontSize: 13 }}>Chưa có giao dịch nào</td>
                  </tr>
                ) : recentTx.map((tx, idx) => (
                  <tr key={tx.id ?? idx}
                    style={{ borderBottom: '1px solid rgba(71,85,105,0.15)', transition: 'background .15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 10px', color: '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      #{tx.bookingCode}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#e2e8f0', maxWidth: 140 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.customerName}>
                        {tx.customerName}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', color: '#94a3b8', maxWidth: 130 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.cinemaName}>
                        {tx.cinemaName}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', color: '#f1f5f9', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {currency.format(tx.amount || 0)}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <StatusBadge status={tx.status} />
                    </td>
                    <td style={{ padding: '10px 10px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {formatDateTime(tx.paidAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  )
}
