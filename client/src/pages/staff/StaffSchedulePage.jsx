import { useEffect, useState } from 'react'
import { Calendar as CalendarIcon, MapPin, Film, Clock } from 'lucide-react'
import staffService from '../../services/staffService'
import Loading from '../../components/Loading'
import FormInput from '../../components/FormInput'
import Button from '../../components/Button'
import {
  formatDate,
  formatTime,
  toDateParam,
  computeShowtimeStatus,
  showtimeStatusMeta,
  fillRate,
  fillRateColor
} from '../../utils/formatters'
import { useAuth } from '../../hooks/useAuth'

export default function StaffSchedulePage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(toDateParam(new Date()))
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const fetchSchedule = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await staffService.getSchedule(selectedDate)
        if (mounted) setData(res.data)
      } catch (err) {
        if (mounted) setError(err.message || 'Lỗi khi tải lịch chiếu')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchSchedule()
    return () => { mounted = false }
  }, [selectedDate])

  const goToToday = () => {
    setSelectedDate(toDateParam(new Date()))
  }

  // Group by roomName
  const groupedData = data.reduce((acc, st) => {
    const room = st.roomName || 'Phòng khác'
    if (!acc[room]) acc[room] = []
    acc[room].push(st)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Lịch chiếu phim</h1>
          <p className="text-sm text-dark-400 font-medium flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            Rạp: {user?.cinemaName || 'Tất cả'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={goToToday} className="h-[38px] px-3 text-sm whitespace-nowrap">
            Hôm nay
          </Button>
          <FormInput
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-[38px] m-0 text-sm"
          />
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <Loading label="Đang tải lịch chiếu..." />
      ) : !data.length ? (
        <div className="rounded-2xl glass p-12 text-center text-dark-500 font-medium">
          <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
          Không có suất chiếu nào trong ngày {formatDate(selectedDate)}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedData).map(([room, showtimes]) => (
            <div key={room} className="rounded-2xl glass overflow-hidden animate-fade-in">
              <div className="bg-dark-800/60 px-5 py-3 border-b border-dark-700/50 flex items-center gap-2">
                <Film className="h-5 w-5 text-red-400" />
                <h2 className="font-bold text-lg text-white">Phòng {room}</h2>
                <span className="ml-auto text-xs font-medium text-dark-400 px-2 py-1 bg-dark-900 rounded-md">
                  {showtimes.length} suất chiếu
                </span>
              </div>
              
              <div className="p-2 sm:p-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {showtimes.sort((a,b) => new Date(a.startTime) - new Date(b.startTime)).map(st => {
                  const status = st.status === 'CANCELLED' ? 'CANCELLED' : computeShowtimeStatus(st.startTime, st.endTime)
                  const meta = showtimeStatusMeta(status)
                  const rate = fillRate(st.soldSeats, st.totalSeats)
                  const rateColor = fillRateColor(rate)

                  return (
                    <div key={st.id} className="rounded-xl border border-dark-700/30 bg-dark-800/30 p-4 hover:bg-dark-800/60 transition-colors relative overflow-hidden group">
                      {/* Active indicator bar */}
                      {status === 'ONGOING' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 text-red-400 font-bold">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(st.startTime)} - {formatTime(st.endTime)}</span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase" style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}>
                          {meta.label}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-white text-base mb-3 line-clamp-1 group-hover:text-red-300 transition-colors">
                        {st.movieTitle}
                      </h3>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-dark-300">
                          <span>Đã đặt: <strong className="text-white">{st.soldSeats}</strong> / {st.totalSeats} ghế</span>
                          <span className="font-medium" style={{ color: rateColor }}>{rate}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-dark-950 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${rate}%`, backgroundColor: rateColor }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
