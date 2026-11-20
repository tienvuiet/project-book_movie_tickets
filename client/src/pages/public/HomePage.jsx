import { ArrowRight, Calendar, Gift, Search, Tag, Ticket } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import MovieCard from '../../components/MovieCard'
import Loading from '../../components/Loading'
import Notification from '../../components/Notification'
import movieService from '../../services/movieService'
import showtimeService from '../../services/showtimeService'
import promotionService from '../../services/promotionService'
import { useAuth } from '../../hooks/useAuth'
import { Link, useSearchParams } from 'react-router-dom'

const ALL_CATEGORIES    = 'Tất cả'
const SLIDE_INTERVAL    = 5000   // 5s — đủ thời gian đọc
const PROMO_PAGE_SIZE   = 3
const PROMO_INTERVAL_MS = 5000   // 5s — không quá nhanh

/* ══════════════════════════════════════════════════════════════════════════
   PROMOTION SLIDER — responsive: mobile full-width, xl sidebar
══════════════════════════════════════════════════════════════════════════ */
function PromotionSlider() {
  const [promos, setPromos]     = useState([])
  const [groupIdx, setGroupIdx] = useState(0)
  const [animKey, setAnimKey]   = useState(0)
  const timerRef                = useRef(null)
  const pausedRef               = useRef(false)

  useEffect(() => {
    promotionService.getAvailable()
      .then((list) => {
        const now = new Date()
        const valid = list.filter((p) => {
          const statusOk = p.status === 'ACTIVE' || p.status === 'EXPIRING_SOON' || p.active
          if (!statusOk) return false
          if (p.endDate && new Date(p.endDate) < now) return false
          const used   = p.usedCount ?? 0
          const maxUse = p.maxUsage  ?? null
          if (maxUse !== null && used >= maxUse) return false
          return true
        })
        setPromos(valid)
      })
      .catch(() => {})
  }, [])

  const totalGroups = promos.length > 0 ? Math.ceil(promos.length / PROMO_PAGE_SIZE) : 0


  /* Tự động slide — pause khi hover/focus, cleanup đúng cách */
  useEffect(() => {
    if (totalGroups <= 1) return

    const tick = () => {
      if (pausedRef.current) return
      setGroupIdx((prev) => {
        const next = (prev + 1) % totalGroups
        setAnimKey((k) => k + 1)
        return next
      })
    }
    timerRef.current = setInterval(tick, PROMO_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [totalGroups])

  const goToGroup = (i) => {
    setGroupIdx(i)
    setAnimKey((k) => k + 1)
  }

  const currentGroup = promos.slice(
    groupIdx * PROMO_PAGE_SIZE,
    groupIdx * PROMO_PAGE_SIZE + PROMO_PAGE_SIZE,
  )

  const discountLabel = (p) => {
    const isPercent = p.discountType === 'PERCENT' || p.discountType === 'PERCENTAGE'
    return isPercent
      ? `Giảm ${p.discountValue}%`
      : `Giảm ${Number(p.discountValue).toLocaleString('vi-VN')}₫`
  }

  if (!promos.length) return null

  return (
    <div
      className="w-full"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      onFocus={() => { pausedRef.current = true }}
      onBlur={() => { pausedRef.current = false }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Gift size={16} className="text-red-500 shrink-0" />
          <span className="text-sm font-extrabold text-slate-100">Khuyến mãi</span>
        </div>
        <Link
          to="/promotions"
          className="flex items-center gap-1 text-xs text-dark-500 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
        >
          Xem tất cả <ArrowRight size={12} />
        </Link>
      </div>

      {/* Cards wrapper */}
      <div className="overflow-hidden">
        <div
          key={animKey}
          className="flex flex-col gap-2.5"
          style={{ animation: 'promoSlideIn 0.42s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          {currentGroup.map((promo) => (
            <Link
              key={promo.id}
              to={`/promotions/${promo.id}`}
              className="promo-home-card block rounded-xl overflow-hidden relative"
              aria-label={`Khuyến mãi: ${promo.name}`}
              style={{
                background: 'rgba(30,41,59,0.7)',
                border: '1px solid rgba(71,85,105,0.3)',
                textDecoration: 'none',
              }}
            >
              {/* Image */}
              <div className="relative w-full overflow-hidden bg-dark-950" style={{ aspectRatio: '16/7' }}>
                {promo.imageUrl ? (
                  <img
                    src={promo.imageUrl}
                    alt={promo.name}
                    loading="lazy"
                    className="promo-home-img w-full h-full object-cover block"
                    style={{ transition: 'transform 0.35s' }}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
                    <Tag size={26} className="text-red-500/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 to-transparent pointer-events-none" />
                <div
                  className="absolute top-1.5 right-1.5 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                    boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                  }}
                >
                  {discountLabel(promo)}
                </div>
              </div>

              {/* Info */}
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold text-slate-100 truncate">{promo.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Tag size={9} className="text-red-500 shrink-0" />
                  <code className="text-[10px] font-bold text-red-300 tracking-wide">{promo.code}</code>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {totalGroups > 1 && (
        <div className="flex justify-center gap-1.5 mt-3" role="group" aria-label="Điều hướng khuyến mãi">
          {Array.from({ length: totalGroups }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToGroup(i)}
              aria-label={`Nhóm khuyến mãi ${i + 1}`}
              aria-pressed={i === groupIdx}
              className="rounded-full border-none cursor-pointer p-0 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              style={{
                padding: '20px 4px',
                margin: '-20px -4px',
                background: 'transparent',
              }}
            >
              <span
                className="block rounded-full"
                style={{
                  height: 4,
                  width: i === groupIdx ? 18 : 4,
                  background: i === groupIdx ? '#ef4444' : 'rgba(255,255,255,0.18)',
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes promoSlideIn {
          from { opacity: 0; transform: translateX(56px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .promo-home-card {
          transition: transform 0.22s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.22s,
                      border-color 0.22s !important;
        }
        .promo-home-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(239,68,68,0.2) !important;
          border-color: rgba(239,68,68,0.3) !important;
        }
        .promo-home-card:hover .promo-home-img {
          transform: scale(1.06);
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-home-card,
          .promo-home-img {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CATEGORY FILTER — scroll ngang trên mobile, wrap trên desktop
══════════════════════════════════════════════════════════════════════════ */
function CategoryFilter({ categories, active, onSelect, colorScheme = 'red' }) {
  const activeClass = colorScheme === 'amber'
    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
    : 'gradient-brand text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)]'

  const inactiveClass = colorScheme === 'amber'
    ? 'border border-dark-700/50 bg-dark-800/40 text-dark-400 hover:border-dark-600 hover:text-dark-300'
    : 'border border-[rgba(71,85,105,0.4)] bg-[rgba(30,41,59,0.4)] text-dark-400 hover:text-dark-200'

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 xl:flex-wrap xl:overflow-visible xl:pb-0"
      role="group"
      aria-label="Lọc theo thể loại"
    >
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          aria-pressed={active === cat}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
            active === cat ? activeClass : inactiveClass
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const [allMovies, setAllMovies] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES)
  const [upcomingCategory, setUpcomingCategory] = useState(ALL_CATEGORIES)
  const [heroIndex, setHeroIndex] = useState(0)

  useEffect(() => {
    const headerQuery = searchParams.get('q') || ''
    setQuery(headerQuery)
    if (headerQuery) {
      window.requestAnimationFrame(() => {
        document.getElementById('now-showing')?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [searchParams])

  useEffect(() => {
    Promise.all([movieService.getAll(), showtimeService.getAll()])
      .then(([movieResponse, showtimeResponse]) => {
        setAllMovies((movieResponse.data || movieResponse || []).filter((movie) => movie.status === 'ACTIVE'))
        setShowtimes(showtimeResponse.data || showtimeResponse || [])
      })
      .catch((err) => {
        setError(err.message)
        setAllMovies([])
      })
      .finally(() => setLoading(false))
  }, [])

  const movieScheduleState = useMemo(() => {
    const now = new Date()
    const state = new Map()
    for (const showtime of showtimes) {
      if (showtime.status === 'CANCELLED') continue
      const endTime = new Date(showtime.endTime)
      if (Number.isNaN(endTime.getTime()) || endTime <= now) continue
      state.set(showtime.movieId, true)
    }
    return state
  }, [showtimes])

  const today = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const activeMovies = useMemo(() => allMovies.filter((movie) =>
    movieScheduleState.has(movie.id) && movie.releaseDate && movie.releaseDate <= today
  ), [allMovies, movieScheduleState, today])

  const upcomingMovies = useMemo(() => allMovies.filter((movie) =>
    movie.releaseDate && movie.releaseDate > today
  ), [allMovies, today])

  const backdrops = useMemo(() =>
    [...activeMovies, ...upcomingMovies]
      .filter((m) => m.backdropUrl)
      .map((m) => ({ url: m.backdropUrl, title: m.title })),
    [activeMovies, upcomingMovies]
  )

  /* Hero slideshow — interval luôn chạy, CSS transition xử lý animation */
  useEffect(() => {
    if (backdrops.length <= 1) return
    const id = setInterval(() => setHeroIndex((prev) => (prev + 1) % backdrops.length), SLIDE_INTERVAL)
    return () => clearInterval(id)
  }, [backdrops.length])

  const activeCategories = useMemo(() => [
    ALL_CATEGORIES,
    ...new Set(activeMovies.flatMap((movie) => movie.genres?.map((g) => g.name) || [])),
  ], [activeMovies])

  const upcomingCategories = useMemo(() => [
    ALL_CATEGORIES,
    ...new Set(upcomingMovies.flatMap((movie) => movie.genres?.map((g) => g.name) || [])),
  ], [upcomingMovies])

  const filteredActive = useMemo(() => activeMovies.filter((movie) => {
    const matchesTitle    = movie.title?.toLowerCase().includes(query.trim().toLowerCase())
    const matchesCategory = activeCategory === ALL_CATEGORIES || movie.genres?.some((g) => g.name === activeCategory)
    return matchesTitle && matchesCategory
  }), [activeMovies, query, activeCategory])

  const filteredUpcoming = useMemo(() => upcomingMovies.filter((movie) => {
    const matchesTitle    = movie.title?.toLowerCase().includes(query.trim().toLowerCase())
    const matchesCategory = upcomingCategory === ALL_CATEGORIES || movie.genres?.some((g) => g.name === upcomingCategory)
    return matchesTitle && matchesCategory
  }), [upcomingMovies, query, upcomingCategory])

  return (
    <>
      {/* ══ Hero ══ */}
      <section
        className="relative overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-[600px]"
        aria-label="Banner phim nổi bật"
      >
        {/* Backdrop slides */}
        {backdrops.length > 0 ? (
          backdrops.map((bd, i) => (
            <div
              key={bd.url}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{ opacity: i === heroIndex ? 1 : 0, zIndex: 0 }}
              aria-hidden={i !== heroIndex}
            >
              <img src={bd.url} alt={bd.title} className="h-full w-full object-cover" />
            </div>
          ))
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e0a0a 50%, #0f172a 100%)', zIndex: 0 }}
          />
        )}

        {/* Gradients overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/80 to-transparent" style={{ zIndex: 1 }} />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-dark-950/60" style={{ zIndex: 1 }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(239,68,68,0.12),transparent)]" style={{ zIndex: 1 }} />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-20 lg:py-28" style={{ zIndex: 2 }}>
          <div className="max-w-2xl animate-fade-in">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl drop-shadow-lg">
              Trải nghiệm
              <span className="text-gradient"> điện ảnh </span>
              đỉnh cao
            </h1>

            <p className="mt-4 sm:mt-5 max-w-lg text-sm sm:text-base leading-relaxed text-dark-300 lg:text-lg drop-shadow-md">
              Khám phá bộ sưu tập phim hot nhất, đặt vé trực tuyến nhanh chóng và tận hưởng những bộ phim bom tấn tại rạp.
            </p>

            <div className="mt-6 sm:mt-8">
              <a
                href="#now-showing"
                className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow-sm transition-all hover:shadow-glow hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 min-h-[44px]"
              >
                <Ticket className="h-4 w-4 shrink-0" />
                Đặt vé ngay
              </a>
            </div>

            <div className="mt-8 sm:mt-10 flex flex-wrap gap-x-6 gap-y-3 sm:gap-8">
              {[
                { value: `${activeMovies.length}`, label: 'Phim đang chiếu' },
                { value: '15K+', label: 'Vé đã bán' },
                { value: '4.9', label: 'Đánh giá' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-xl font-bold text-white sm:text-2xl lg:text-3xl drop-shadow-md">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-dark-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {backdrops.length > 1 && (
              <div className="mt-6 sm:mt-8 flex gap-2" role="group" aria-label="Điều hướng backdrop">
                {backdrops.map((bd, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    aria-label={`Backdrop phim ${bd.title || i + 1}`}
                    aria-pressed={i === heroIndex}
                    style={{ padding: '12px 0', margin: '-12px 0', background: 'transparent' }}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <span
                      className="block rounded-full transition-all duration-500"
                      style={{
                        height: 6,
                        width: i === heroIndex ? 32 : 12,
                        background: i === heroIndex ? '#ef4444' : 'rgba(255,255,255,0.3)',
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PHIM ĐANG CHIẾU
          Mobile/tablet: full width, carousel ngang
          Desktop xl+: bên trái, sidebar khuyến mãi bên phải
      ══════════════════════════════════════════════════════════════ */}
      <section id="now-showing" className="relative">
        <div className="absolute inset-0 bg-dark-950" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-7 items-start">

            {/* Cột phim đang chiếu */}
            <div className="min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shrink-0"
                    style={{ boxShadow: '0 0 8px #ef4444' }}
                  />
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-100 m-0">
                    Phim đang chiếu
                  </h2>
                </div>
                <Link
                  to="/schedule"
                  className="flex items-center gap-1 text-xs sm:text-sm text-dark-500 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                >
                  Xem tất cả <ArrowRight size={13} />
                </Link>
              </div>

              {/* Filter thể loại */}
              <div className="mb-4">
                <CategoryFilter
                  categories={activeCategories}
                  active={activeCategory}
                  onSelect={setActiveCategory}
                  colorScheme="red"
                />
              </div>

              <Notification type="error" message={error} />

              {loading ? (
                <Loading />
              ) : filteredActive.length ? (
                <>
                  {/*
                    Mobile < sm: carousel cuộn ngang, mỗi card ~44% viewport
                    (thấy ~2 card + peek card tiếp theo)
                  */}
                  <div className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 scrollbar-hide -mx-4 px-4">
                    {filteredActive.map((movie) => (
                      <div key={movie.id} className="snap-start shrink-0 w-[44%]">
                        <MovieCard movie={movie} />
                      </div>
                    ))}
                  </div>
                  {/* sm+: grid bình thường */}
                  <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
                    {filteredActive.map((movie, index) => (
                      <div
                        key={movie.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <MovieCard movie={movie} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-dark-700/40 bg-dark-800/30 px-6 py-12 text-center">
                  <Search size={24} className="text-dark-600 mx-auto mb-2" />
                  <p className="text-dark-400 font-semibold text-sm">Không tìm thấy phim đang chiếu</p>
                  <p className="text-dark-600 text-xs mt-1">Thử tìm với từ khóa khác</p>
                </div>
              )}
            </div>

            {/* Sidebar khuyến mãi — CHỈ hiện trên xl+, mobile/tablet ẩn */}
            <div className="hidden xl:block">
              <PromotionSlider />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PHIM SẮP CHIẾU
          Mobile/tablet: full width, carousel ngang
          Desktop: grid
      ══════════════════════════════════════════════════════════════ */}
      {!loading && upcomingMovies.length > 0 && (
        <section id="coming-soon" className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-dark-900/50 to-dark-950" />
          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:py-16">
            <div className="mb-5 sm:mb-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="uppercase tracking-wider">Sắp chiếu</span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold text-white sm:text-3xl lg:text-4xl">Phim sắp chiếu</h2>
              <p className="mt-1 text-xs text-dark-500 sm:mt-2 sm:text-base">
                Những bộ phim bom tấn sắp ra mắt tại rạp — đón chờ nhé!
              </p>
            </div>

            {upcomingCategories.length > 1 && (
              <div className="mb-5 sm:mb-8">
                <CategoryFilter
                  categories={upcomingCategories}
                  active={upcomingCategory}
                  onSelect={setUpcomingCategory}
                  colorScheme="amber"
                />
              </div>
            )}

            {filteredUpcoming.length ? (
              <>
                {/*
                  Mobile < sm: carousel cuộn ngang
                  sm+: grid bình thường
                */}
                <div className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 scrollbar-hide -mx-4 px-4">
                  {filteredUpcoming.map((movie) => (
                    <div key={movie.id} className="snap-start shrink-0 w-[44%]">
                      <MovieCard movie={movie} badge="Sắp chiếu" showReleaseDate />
                    </div>
                  ))}
                </div>
                <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
                  {filteredUpcoming.map((movie, index) => (
                    <div key={movie.id} className="animate-slide-up h-full" style={{ animationDelay: `${index * 50}ms` }}>
                      <MovieCard movie={movie} badge="Sắp chiếu" showReleaseDate />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-dark-700/50 bg-dark-800/30 p-12 text-center">
                <p className="text-dark-400 font-medium">Không tìm thấy phim sắp chiếu phù hợp</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          KHUYẾN MÃI — CHỈ hiện trên mobile/tablet (< xl)
          Desktop xl+ dùng sidebar trong section now-showing
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative xl:hidden">
        <div className="absolute inset-0 bg-dark-950" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <PromotionSlider />
        </div>
      </section>

      {/* ══ CTA cuối trang ══ */}
      {!isAuthenticated && (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-dark-900/50 to-purple-500/10" />
          <div className="absolute inset-0 bg-dark-950/80" />
          <div className="relative mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center lg:py-20">
            <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Sẵn sàng cho một bộ phim tuyệt vời?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-dark-400 sm:text-base">
              Đăng ký ngay để nhận thông báo về phim mới, ưu đãi đặc biệt và đặt vé nhanh hơn.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl gradient-brand px-7 py-3 text-sm font-semibold text-white shadow-glow-sm transition-all hover:shadow-glow hover:brightness-110 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Đăng ký miễn phí <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/50 px-7 py-3 text-sm font-semibold text-dark-200 transition-all hover:bg-dark-700/50 hover:text-white min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-500"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
          <div className="absolute left-1/4 top-0 h-40 w-40 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
          <div className="absolute right-1/4 bottom-0 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        </section>
      )}
    </>
  )
}
