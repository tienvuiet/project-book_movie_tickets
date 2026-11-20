import { useEffect, useState } from 'react'
import { CalendarCheck, Clock, Film, MapPin, TicketCheck, Users } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import staffService from '../../services/staffService'
import Loading from '../../components/Loading'
import { formatDateLong, formatTime, showtimeStatusMeta, computeShowtimeStatus, fillRate, fillRateColor } from '../../utils/formatters'

export default function StaffDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const res = await staffService.getDashboard()
        if (mounted) {
          setData(res.data)
          setError(null)
        }
      } catch (err) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [])

  if (loading) return <Loading label="Đang tải dữ liệu tổng quan..." />
  if (error) return <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-sm text-red-400">{error}</div>

  // If backend returns no data or fails gracefully, provide fallback structure
  const stats = data?.stats || { checkedInToday: 0, pendingCheckin: 0, showtimesToday: 0, upcomingShowtimes: 0 }
  const upcomingShowtimes = data?.upcomingShowtimes || []
  const recentCheckins = data?.recentCheckins || []
  const cinemaName = data?.cinemaName || user?.cinemaName || 'Rạp chưa phân công'

  const statCards = [
    { icon: TicketCheck, label: 'Vé đã check-in hôm nay', value: stats.checkedInToday, gradient: 'gradient-brand', glow: 'shadow-glow-sm' },
    { icon: Users, label: 'Vé chờ check-in', value: stats.pendingCheckin, gradient: 'gradient-orange', glow: 'shadow-glow-sm' },
    { icon: CalendarCheck, label: 'Suất chiếu hôm nay', value: stats.showtimesToday, gradient: 'gradient-accent', glow: 'shadow-glow-sm' },
    { icon: Clock, label: 'Suất sắp bắt đầu', value: stats.upcomingShowtimes, gradient: 'gradient-blue', glow: 'shadow-glow-sm' },
  ]

  // Ca làm việc cơ bản (sáng/chiều/tối) dựa theo giờ
  const currentHour = new Date().getHours()
  let shift = 'Ca Tối'
  if (currentHour >= 6 && currentHour < 14) shift = 'Ca Sáng'
  else if (currentHour >= 14 && currentHour < 22) shift = 'Ca Chiều'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl glass p-4 sm:p-6">
        <div>
          <h1 className="text-lg font-bold text-white sm:text-2xl">Xin chào, {user?.fullName} 👋</h1>
          <p className="text-sm text-dark-400 font-medium mt-0.5">{formatDateLong(new Date())} • {shift}</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-dark-800/60 px-3 py-2 rounded-xl border border-dark-700/50 self-start sm:self-auto">
          <MapPin className="h-4 w-4 shrink-0 text-red-400" />
          <span className="font-semibold text-white text-sm truncate max-w-[200px]">{cinemaName}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="group rounded-2xl glass p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg animate-slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white group-hover:text-red-400 transition-colors">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.gradient} ${stat.glow}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left col: Showtimes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Film className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">Suất chiếu sắp diễn ra</h2>
          </div>

          {!upcomingShowtimes.length ? (
            <div className="rounded-2xl glass p-8 text-center text-dark-500 font-medium">
              Không có suất chiếu nào sắp diễn ra
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingShowtimes.map((st) => {
                const status = st.status === 'CANCELLED' ? 'CANCELLED' : computeShowtimeStatus(st.startTime, st.endTime)
                const meta = showtimeStatusMeta(status)
                const rate = fillRate(st.soldSeats, st.totalSeats)
                const rateColor = fillRateColor(rate)

                return (
                  <div key={st.id} className="rounded-2xl glass p-3 sm:p-4 flex gap-3 items-start hover:bg-dark-800/40 transition-colors">
                    <img
                      src={st.moviePoster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                      alt={st.movieTitle}
                      className="w-12 h-16 sm:w-16 sm:h-20 object-cover rounded-lg flex-shrink-0 bg-dark-800"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate text-sm sm:text-base">{st.movieTitle}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-dark-400">
                        <span className="font-semibold text-red-400">{formatTime(st.startTime)}</span>
                        <span>Phòng: <span className="text-white font-medium">{st.roomName}</span></span>
                        <span>Ghế: <span className="text-white font-medium">{st.soldSeats}/{st.totalSeats}</span></span>
                      </div>
                      {/* Progress bar for fill rate */}
                      <div className="mt-2 h-1.5 w-full max-w-[180px] bg-dark-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${rate}%`, backgroundColor: rateColor }}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full border" style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}>
                        {meta.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right col: Recent Check-ins */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TicketCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Vừa check-in</h2>
          </div>

          {!recentCheckins.length ? (
            <div className="rounded-2xl glass p-8 text-center text-dark-500 font-medium">
              Chưa có hoạt động check-in nào
            </div>
          ) : (
            <div className="rounded-2xl glass overflow-hidden">
              <div className="divide-y divide-dark-700/40">
                {recentCheckins.map((booking) => (
                  <div key={booking.id} className="p-4 hover:bg-dark-800/40 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-white">{booking.bookingCode}</span>
                      <span className="text-xs text-dark-400">{formatTime(booking.checkinTime)}</span>
                    </div>
                    <p className="text-sm font-medium text-dark-300 truncate">{booking.customerName}</p>
                    <p className="text-xs text-dark-500 mt-1 truncate">{booking.movieTitle} • P.{booking.roomName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
