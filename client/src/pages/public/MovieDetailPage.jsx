import { CalendarDays, Clock, MapPin, Play, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Loading from '../../components/Loading'
import movieService from '../../services/movieService'
import showtimeService from '../../services/showtimeService'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatters'

// Generate next N days starting from today
function getNextDays(count = 7) {
  const days = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    days.push({
      date: [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'),
      dayOfWeek: d.toLocaleDateString('vi-VN', { weekday: 'long' }),
      dayMonth: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      isToday: i === 0,
    })
  }
  return days
}

function getSelectableDays(showtimes) {
  const dates = new Set(getNextDays().map((day) => day.date))
  showtimes.forEach((showtime) => {
    const date = showtime.startTime?.slice(0, 10)
    if (date) dates.add(date)
  })

  const today = new Date()
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-')
  return Array.from(dates).sort().map((date) => {
    const d = new Date(`${date}T00:00:00`)
    return {
      date,
      dayOfWeek: d.toLocaleDateString('vi-VN', { weekday: 'long' }),
      dayMonth: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      isToday: date === todayKey,
    }
  })
}

const unwrap = (r) => r?.data ?? r ?? []

export default function MovieDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, roles } = useAuth()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const days = useMemo(() => getSelectableDays(showtimes), [showtimes])
  const [selectedDate, setSelectedDate] = useState('')
  const activeDate = selectedDate || showtimes[0]?.startTime?.slice(0, 10) || days[0]?.date || ''

  useEffect(() => {
    Promise.all([movieService.getById(id), showtimeService.getByMovie(id)])
      .then(([m, s]) => {
        setMovie(m.data || m)
        setShowtimes(unwrap(s))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // Filter showtimes by selected date, group by cinema then by room
  const grouped = useMemo(() => {
    const filtered = showtimes.filter((s) => s.startTime?.startsWith(activeDate))
    const cinemaMap = new Map()
    for (const s of filtered) {
      const key = s.cinemaId
      if (!cinemaMap.has(key)) {
        cinemaMap.set(key, { id: s.cinemaId, name: s.cinemaName, address: s.cinemaAddress, rooms: new Map() })
      }
      const cinema = cinemaMap.get(key)
      if (!cinema.rooms.has(s.roomId)) {
        cinema.rooms.set(s.roomId, { id: s.roomId, name: s.roomName, showtimes: [] })
      }
      cinema.rooms.get(s.roomId).showtimes.push(s)
    }
    return Array.from(cinemaMap.values()).map((c) => ({
      ...c,
      rooms: Array.from(c.rooms.values()),
    }))
  }, [showtimes, activeDate])

  if (loading) return <Loading />
  if (!movie) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-red-400">{error || 'Không tìm thấy phim.'}</div>

  const book = (showtimeId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/booking/${showtimeId}` } } })
    } else if (roles.some((role) => ['CUSTOMER', 'ADMIN', 'STAFF'].includes(role))) {
      navigate(`/booking/${showtimeId}`)
    } else {
      navigate('/403')
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Keep the backdrop inside the compact movie hero so it is not hidden by the layout background. */}
      <div className="relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={
            movie.backdropUrl ||
            movie.posterUrl ||
            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80'
          }
          alt=""
          className="h-full w-full scale-105 object-cover opacity-30 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/35 via-dark-950/75 to-dark-950" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr] lg:py-8">
          {/* Poster */}
          <div className="animate-fade-in">
            <img
              className="mx-auto aspect-[2/3] w-full max-w-[220px] rounded-2xl object-cover shadow-glass-lg ring-1 ring-white/10"
              src={
                movie.posterUrl ||
                'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80'
              }
              alt={movie.title}
            />
          </div>

          {/* Details */}
          <div className="animate-slide-up">
            {/* Rating */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-300">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                8.5 / 10
              </div>
              <span className="rounded-lg bg-dark-800/60 px-3 py-1.5 text-xs font-semibold text-dark-300">
                Đang chiếu
              </span>
            </div>

            <h1 className="text-3xl font-bold text-white lg:text-4xl">{movie.title}</h1>

            <p className="mt-4 text-base leading-relaxed text-dark-400">{movie.description}</p>

            {/* Meta */}
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-dark-400">
              <span className="inline-flex items-center gap-2 rounded-lg bg-dark-800/40 px-3 py-2">
                <Clock className="h-4 w-4 text-dark-500" />
                {movie.durationMinutes || 120} phút
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-dark-800/40 px-3 py-2">
                <CalendarDays className="h-4 w-4 text-dark-500" />
                {movie.releaseDate || 'Đang chiếu'}
              </span>
            </div>

            {/* Trailer button */}
            {movie.trailerUrl && (
              <a
                href={movie.trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/50 px-5 py-2.5 text-sm font-semibold text-dark-200 transition-all hover:bg-dark-700/50 hover:text-white"
              >
                <Play className="h-4 w-4" />
                Xem trailer
              </a>
            )}
          </div>
        </section>
      </div>
      </div>

      {/* Showtime section */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="text-2xl font-bold text-white mb-6">Lịch chiếu & Mua vé</h2>

        {/* Date selector */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => setSelectedDate(d.date)}
              className={`flex-shrink-0 flex flex-col items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 min-w-[90px] ${
                activeDate === d.date
                  ? 'gradient-brand text-white shadow-glow-sm'
                  : 'bg-dark-800/60 text-dark-400 border border-dark-700/50 hover:bg-dark-700/60 hover:text-dark-200'
              }`}
            >
              <span className="text-xs opacity-80">{d.isToday ? 'Hôm nay' : d.dayOfWeek}</span>
              <span className="text-base font-bold mt-0.5">{d.dayMonth}</span>
            </button>
          ))}
        </div>

        {/* Grouped by cinema */}
        {grouped.length > 0 ? (
          <div className="space-y-5 animate-fade-in">
            {grouped.map((cinema) => (
              <div key={cinema.id} className="rounded-2xl glass p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white">{cinema.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-dark-400">
                    <MapPin className="h-3.5 w-3.5 text-dark-500" />
                    {cinema.address}
                  </p>
                </div>

                <div className="space-y-4">
                  {cinema.rooms.map((room) => (
                    <div key={room.id}>
                      <p className="text-sm font-semibold text-dark-300 mb-2">{room.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {room.showtimes.map((s) => {
                          const time = new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <button
                              key={s.id}
                              onClick={() => book(s.id)}
                              className="group flex flex-col items-center rounded-xl border border-dark-700/50 bg-dark-800/40 px-4 py-2.5 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-glow-sm"
                            >
                              <span className="text-sm font-bold text-white group-hover:text-red-300">{time}</span>
                              <span className="text-[11px] text-dark-500 group-hover:text-red-400/80">{formatCurrency(s.basePrice)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-dark-700 p-12 text-center animate-fade-in">
            <div className="flex flex-col items-center gap-3 text-dark-500">
              <CalendarDays className="h-10 w-10 text-dark-600" />
              <p className="text-base">Không có suất chiếu nào cho ngày này.</p>
              <p className="text-sm text-dark-600">Vui lòng chọn ngày khác để xem lịch chiếu.</p>
            </div>
          </div>
        )}
        </section>
    </div>
  )
}
