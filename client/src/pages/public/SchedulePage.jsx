import { CalendarDays } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Loading from '../../components/Loading'
import movieService from '../../services/movieService'
import showtimeService from '../../services/showtimeService'
import { useAuth } from '../../hooks/useAuth'

// Generate next N days starting from today
function getSelectableDays(showtimes) {
  const dates = new Set()

  // Add next 7 days by default so we always have dates to click
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    dates.add([d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'))
  }

  showtimes.forEach((showtime) => {
    const date = showtime.startTime?.slice(0, 10)
    if (date) dates.add(date)
  })

  const todayKey = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')

  return Array.from(dates)
    .sort()
    .filter((date) => date >= todayKey) // Only future or today
    .map((date) => {
      const d = new Date(`${date}T00:00:00`)
      return {
        date,
        dayOfWeek: d.toLocaleDateString('vi-VN', { weekday: 'long' }),
        dayMonth: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        isToday: date === todayKey,
      }
    })
}

const unwrap = (r) => r?.data ?? r ?? []

function groupByCinema(showtimes) {
  const cinemas = new Map()
  showtimes.forEach((showtime) => {
    const key = showtime.cinemaId || 'unknown'
    if (!cinemas.has(key)) {
      cinemas.set(key, {
        id: key,
        name: showtime.cinemaName || 'Rạp chiếu phim',
        address: showtime.cinemaAddress || '',
        showtimes: [],
      })
    }
    cinemas.get(key).showtimes.push(showtime)
  })
  return Array.from(cinemas.values())
}

export default function SchedulePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedCinemaId = Number(searchParams.get('cinemaId')) || null
  const { isAuthenticated, roles } = useAuth()
  const [movies, setMovies] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([movieService.getAll(), showtimeService.getAll()])
      .then(([mRes, sRes]) => {
        setMovies(unwrap(mRes))
        setShowtimes(unwrap(sRes))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const moviesById = useMemo(() => new Map(movies.map((movie) => [movie.id, movie])), [movies])
  const today = useMemo(() => {
    const now = new Date()
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
  }, [])
  const releasedShowtimes = useMemo(() => showtimes.filter((showtime) => {
    const movie = moviesById.get(showtime.movieId)
    return movie?.status === 'ACTIVE' && movie.releaseDate && movie.releaseDate <= today
  }), [showtimes, moviesById, today])

  const scopedShowtimes = useMemo(
    () => selectedCinemaId == null
      ? releasedShowtimes
      : releasedShowtimes.filter((showtime) => showtime.cinemaId === selectedCinemaId),
    [releasedShowtimes, selectedCinemaId],
  )
  const days = useMemo(() => getSelectableDays(scopedShowtimes), [scopedShowtimes])
  const firstAvailableDate = useMemo(() => {
    const now = new Date()
    return scopedShowtimes
      .filter((showtime) => showtime.status !== 'CANCELLED' && new Date(showtime.startTime) > now)
      .map((showtime) => showtime.startTime?.slice(0, 10))
      .filter(Boolean)
      .sort()[0] || ''
  }, [scopedShowtimes])
  const [selectedDate, setSelectedDate] = useState('')
  const activeDate = days.some((day) => day.date === selectedDate)
    ? selectedDate
    : firstAvailableDate || days[0]?.date || ''

  const groupedMovies = useMemo(() => {
    if (!activeDate) return []

    // Filter showtimes by selected date
    const now = new Date()
    const filteredShowtimes = scopedShowtimes.filter((s) => {
      if (!s.startTime?.startsWith(activeDate)) return false
      if (s.status === 'CANCELLED') return false
      return new Date(s.startTime) > now
    })

    // Group showtimes by movie
    const movieMap = new Map()

    for (const s of filteredShowtimes) {
      if (!movieMap.has(s.movieId)) {
        // Find full movie details to get genres
        const fullMovie = moviesById.get(s.movieId)
        movieMap.set(s.movieId, {
          id: s.movieId,
          title: s.movieTitle,
          posterUrl: s.moviePosterUrl,
          durationMinutes: s.durationMinutes,
          genres: fullMovie?.genres || [],
          releaseDate: fullMovie?.releaseDate,
          showtimes: [],
        })
      }
      movieMap.get(s.movieId).showtimes.push(s)
    }

    return Array.from(movieMap.values())
      .map((movie) => ({
        ...movie,
        showtimes: movie.showtimes.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'vi'))
  }, [scopedShowtimes, moviesById, activeDate])

  const book = (showtimeId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/booking/${showtimeId}` } } })
    } else if (roles.some((role) => ['CUSTOMER', 'ADMIN', 'STAFF'].includes(role))) {
      navigate(`/booking/${showtimeId}`)
    } else {
      navigate('/403')
    }
  }

  if (loading) return <Loading />

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-dark-950">
      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-96 w-[120%] -translate-x-1/2 bg-red-600/[0.03] blur-[100px] rounded-[100%]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        {/* Title */}
        <div className="mb-10 flex items-center justify-center gap-3 animate-fade-in">
          <div className="h-3 w-3 rounded-full bg-red-500 shadow-glow" />
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Phim đang chiếu</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Date selector */}
        <div className="mb-10 flex justify-start gap-4 overflow-x-auto pb-4 scrollbar-hide sm:justify-center">
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => setSelectedDate(d.date)}
              className={`min-w-[124px] flex-shrink-0 rounded-lg border px-5 py-2.5 text-sm transition-all duration-300 ${
                activeDate === d.date
                  ? 'border-red-500 bg-gradient-to-br from-red-600 to-red-500 text-white shadow-glow-sm shadow-red-500/20'
                  : 'border-dark-700 bg-dark-800/40 text-dark-400 hover:border-red-500/50 hover:bg-dark-700/50 hover:text-white'
              }`}
            >
              <span className="text-base font-bold">{d.date.split('-').reverse().join('-')}</span>
            </button>
          ))}
        </div>

        {/* Movie list */}
        {groupedMovies.length > 0 ? (
          <div className="grid gap-8 xl:grid-cols-2 animate-fade-in">
            {groupedMovies.map((movie) => (
              <article key={movie.id} className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-[20px] border border-dark-700/50 bg-[#12161d] transition-all duration-300 hover:-translate-y-1 hover:border-dark-500 hover:shadow-xl hover:shadow-dark-900/50 sm:flex-row">
                {/* Badge 2D/3D (mocking as 2D for now since there is no type in db) */}
                <div className="absolute right-5 top-5 z-10 rounded-md border border-dark-600 bg-dark-900/80 px-2.5 py-1 text-xs font-bold text-dark-200 backdrop-blur-md">
                  2D
                </div>

                {/* Poster */}
                <div className="w-full flex-shrink-0 sm:w-[240px]">
                  <div className="h-[360px] w-full cursor-pointer overflow-hidden sm:h-full relative" onClick={() => navigate(`/movies/${movie.id}`)}>
                    <img
                      src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'}
                      alt={movie.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12161d] via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#12161d]/90" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col p-6 pr-16 sm:p-8 sm:pr-16 relative">
                  <div className="mb-2.5 flex flex-wrap items-center gap-2.5 text-xs text-dark-400">
                    <span>
                      {movie.genres.map((g) => g.name).join(', ') || 'Chưa cập nhật'}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-dark-600" />
                    <span>{movie.durationMinutes || 0} phút</span>
                  </div>

                  <h3
                    className="text-xl font-bold text-white mb-4 uppercase leading-snug cursor-pointer group-hover:text-red-400 transition"
                    onClick={() => navigate(`/movies/${movie.id}`)}
                  >
                    {movie.title}
                  </h3>

                  <div className="space-y-1.5 mb-6 text-sm">
                    <p className="text-dark-400">
                      <span className="text-dark-500 mr-2">Xuất xứ:</span>
                      <span className="text-dark-200">Mỹ</span>
                    </p>
                    <p className="text-dark-400">
                      <span className="text-dark-500 mr-2">Khởi chiếu:</span>
                      <span className="text-dark-200">{movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('vi-VN') : 'Đang chiếu'}</span>
                    </p>
                    <p className="text-red-500/90 font-medium text-xs pt-1">
                      Phim được phổ biến đến người xem dưới 13 tuổi và có người bảo hộ đi kèm
                    </p>
                  </div>

                  <div className="mt-auto">
                    <h4 className="text-sm font-semibold text-white mb-3">
                      Lịch chiếu
                    </h4>
                    <div className="space-y-3">
                      {groupByCinema(movie.showtimes).map((cinema) => (
                        <div key={cinema.id}>
                          <p className="mb-2 truncate text-xs font-medium text-slate-400" title={cinema.address}>{cinema.name}</p>
                          <div className="flex flex-wrap gap-2.5">
                            {cinema.showtimes.map((showtime) => {
                              const time = new Date(showtime.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              return (
                                <button
                                  key={showtime.id}
                                  onClick={() => book(showtime.id)}
                                  className="min-w-[64px] rounded-md border border-dark-500 bg-transparent px-3.5 py-1.5 text-sm font-bold text-dark-200 transition-all hover:border-red-500 hover:bg-red-500 hover:text-white"
                                  title={`${cinema.name} · ${showtime.roomName || 'Phòng chiếu'}`}
                                >
                                  {time}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-dark-700 p-12 text-center animate-fade-in mt-8">
            <div className="flex flex-col items-center gap-3 text-dark-500">
              <CalendarDays className="h-12 w-12 text-dark-600" />
              <p className="text-lg font-medium text-white">Không có suất chiếu nào</p>
              <p className="text-sm">Vui lòng chọn ngày khác để xem lịch chiếu.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
