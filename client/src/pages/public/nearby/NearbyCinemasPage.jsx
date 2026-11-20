import {
  AlertCircle,
  Loader2,
  LocateFixed,
  MapPin,
  SearchX,
  Signal,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import cinemaService from '../../../services/cinemaService'
import showtimeService from '../../../services/showtimeService'
import {
  calculateDistanceKm,
  sortCinemas,
} from '../../../utils/cinemaLocationUtils'
import CinemaListItem from './CinemaListItem'
import NearbyCinemaMap from './NearbyCinemaMap'

// Trạng thái định vị
const LOCATION_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  GRANTED: 'granted',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
  ERROR: 'error',
}

const SORT_OPTIONS = [
  { value: 'nearest', label: 'Gần nhất' },
  { value: 'az', label: 'A–Z' },
  { value: 'today', label: 'Hôm nay' },
]

export default function NearbyCinemasPage() {
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const desktopListRef = useRef(null)
  const mobileListRef = useRef(null)

  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState(LOCATION_STATUS.IDLE)
  const [locationError, setLocationError] = useState('')
  const [selectedCinema, setSelectedCinema] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('nearest')
  const [routeCinema, setRouteCinema] = useState(null)
  const [cinemas, setCinemas] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    Promise.all([cinemaService.getAll(), showtimeService.getAll()])
      .then(([cinemaResponse, showtimeResponse]) => {
        const cinemaRows = cinemaResponse?.data ?? cinemaResponse ?? []
        const showtimeRows = showtimeResponse?.data ?? showtimeResponse ?? []
        setCinemas(Array.isArray(cinemaRows) ? cinemaRows.filter((c) => c.status === 'ACTIVE') : [])
        setShowtimes(Array.isArray(showtimeRows) ? showtimeRows : [])
      })
      .catch((error) => setDataError(error.message || 'Không thể tải danh sách rạp.'))
      .finally(() => setLoading(false))
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus(LOCATION_STATUS.UNSUPPORTED)
      return
    }
    setLocationStatus(LOCATION_STATUS.LOADING)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus(LOCATION_STATUS.GRANTED)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus(LOCATION_STATUS.DENIED)
          setLocationError('Bạn đã từ chối quyền vị trí. Vui lòng cấp lại trong cài đặt trình duyệt.')
        } else {
          setLocationStatus(LOCATION_STATUS.ERROR)
          setLocationError('Không thể lấy vị trí. Vui lòng thử lại.')
        }
      },
      { timeout: 8000, enableHighAccuracy: true },
    )
  }, [])

  const cinemasWithDistance = useMemo(() => {
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    const scheduleByCinema = new Map()

    showtimes.forEach((s) => {
      if (s.status === 'CANCELLED' || !s.startTime) return
      const startTime = new Date(s.startTime)
      if (Number.isNaN(startTime.getTime()) || startTime <= now) return
      const item = scheduleByCinema.get(s.cinemaId) || { hasShowtimesToday: false, nextStartTime: null }
      if (s.startTime.startsWith(today)) item.hasShowtimesToday = true
      if (!item.nextStartTime || startTime < item.nextStartTime) item.nextStartTime = startTime
      scheduleByCinema.set(s.cinemaId, item)
    })

    return cinemas.map((cinema) => {
      const schedule = scheduleByCinema.get(cinema.id)
      const lat = cinema.latitude == null ? null : Number(cinema.latitude)
      const lng = cinema.longitude == null ? null : Number(cinema.longitude)
      const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      const base = {
        ...cinema,
        latitude: lat,
        longitude: lng,
        hasCoordinates,
        hasShowtimesToday: Boolean(schedule?.hasShowtimesToday),
        nextShowtime: schedule?.nextStartTime
          ? schedule.nextStartTime.toLocaleString('vi-VN', {
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
            })
          : null,
        imageUrl: cinema.imageUrl || null,
      }
      if (!userLocation || !hasCoordinates) return { ...base, distanceKm: null }
      return {
        ...base,
        distanceKm: Math.round(calculateDistanceKm(userLocation, { lat, lng }) * 10) / 10,
      }
    })
  }, [cinemas, showtimes, userLocation])

  const filteredCinemas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? cinemasWithDistance.filter(
          (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q),
        )
      : cinemasWithDistance
    return sortCinemas(filtered, sortBy, userLocation)
  }, [cinemasWithDistance, searchQuery, sortBy, userLocation])

  const handleSelectCinema = useCallback((cinema) => {
    setSelectedCinema((prev) => (prev?.id === cinema.id ? null : cinema))
  }, [])

  const handleMapSelectCinema = useCallback((cinema) => {
    setSelectedCinema(cinema)
    window.requestAnimationFrame(() => {
      desktopListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      mobileListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [])

  const handleViewSchedule = useCallback(
    (cinemaId) => navigate(`/schedule?cinemaId=${cinemaId}`),
    [navigate],
  )

  const handleGetDirections = useCallback(
    (cinema) => {
      if (!cinema.hasCoordinates) {
        setDataError(`Rạp "${cinema.name}" chưa có tọa độ.`)
        return
      }
      setDataError('')
      setSelectedCinema(cinema)
      setRouteCinema(cinema)
      if (!userLocation) requestLocation()
    },
    [requestLocation, userLocation],
  )

  const mappableCinemas = useMemo(
    () => filteredCinemas.filter((c) => c.hasCoordinates),
    [filteredCinemas],
  )

  return (
    /*
     * Layout tổng: flex-col, chiếm đúng viewport còn lại (trừ header nav ~56px)
     * Dùng h-[calc(100vh-56px)] để trang không scroll ngoài ý muốn trên desktop
     */
    <div className="flex flex-col bg-dark-950" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── HEADER + SEARCH: compact, không py quá lớn ── */}
      <div className="relative z-10 shrink-0 border-b border-dark-800/60 bg-dark-900/70 backdrop-blur-sm">
        <div className="px-4 sm:px-6">

          {/* Row 1: icon + location status */}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md gradient-brand shadow-glow-sm">
                <MapPin className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Tìm rạp</span>
            </div>

            {/* Location status — compact */}
            <div className="flex shrink-0 items-center gap-2">
              {locationStatus === LOCATION_STATUS.IDLE && (
                <button
                  onClick={requestLocation}
                  aria-label="Sử dụng vị trí hiện tại"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20 hover:text-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-95"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Vị trí hiện tại</span>
                  <span className="sm:hidden">Định vị</span>
                </button>
              )}

              {locationStatus === LOCATION_STATUS.LOADING && (
                <div className="inline-flex items-center gap-1.5 text-xs text-blue-400" aria-live="polite">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Đang lấy vị trí...</span>
                </div>
              )}

              {locationStatus === LOCATION_STATUS.GRANTED && (
                <button
                  onClick={requestLocation}
                  aria-label="Cập nhật vị trí"
                  title="Đã xác định vị trí — bấm để cập nhật"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 transition hover:bg-green-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
                >
                  <Signal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Đã định vị</span>
                </button>
              )}

              {(locationStatus === LOCATION_STATUS.DENIED || locationStatus === LOCATION_STATUS.ERROR) && (
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400"
                  role="alert"
                  title={locationError}
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline max-w-[180px] truncate">{locationError}</span>
                  {locationStatus === LOCATION_STATUS.ERROR && (
                    <button onClick={requestLocation} className="underline hover:text-red-300">
                      Thử lại
                    </button>
                  )}
                </div>
              )}

              {locationStatus === LOCATION_STATUS.UNSUPPORTED && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dark-600 bg-dark-800/50 px-2.5 py-1.5 text-xs text-dark-500"
                  role="alert"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Không hỗ trợ định vị</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: search + sort (một hàng gọn) */}
          <div className="flex items-center gap-2 pb-2.5">
            {/* Search */}
            <div className="relative min-w-0 flex-1 max-w-xs">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-500" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tên hoặc địa chỉ rạp..."
                aria-label="Tìm kiếm rạp"
                className="w-full rounded-lg border border-dark-700/50 bg-dark-800/60 py-1.5 pl-8 pr-7 text-xs text-dark-200 placeholder:text-dark-500 outline-none transition focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-dark-500 hover:text-dark-200 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Sắp xếp">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  aria-pressed={sortBy === opt.value}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 ${
                    sortBy === opt.value
                      ? 'gradient-brand text-white shadow-glow-sm'
                      : 'border border-dark-700/50 bg-dark-800/50 text-dark-400 hover:border-dark-600 hover:bg-dark-700/50 hover:text-dark-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Count */}
            <span
              className="ml-auto shrink-0 text-xs text-dark-600"
              aria-live="polite"
              aria-atomic="true"
            >
              {filteredCinemas.length} rạp
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN: sidebar + map, flex-1 để chiếm phần còn lại ── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {dataError && (
          <div
            className="absolute inset-x-3 top-2 z-20 rounded-lg border border-red-500/20 bg-red-950/90 px-3 py-2 text-center text-xs text-red-300"
            role="alert"
          >
            {dataError}
          </div>
        )}

        {/* ── DESKTOP: sidebar trái (360px) + map phải ── */}
        <div className="hidden w-full lg:flex">
          {/* Sidebar */}
          <aside
            className="flex w-[360px] shrink-0 flex-col border-r border-dark-800/50 bg-dark-900/20"
            aria-label="Danh sách rạp chiếu phim"
          >
            <div ref={desktopListRef} className="flex-1 overflow-y-auto p-2.5 space-y-2">
              <CinemaList
                cinemas={filteredCinemas}
                selectedCinema={selectedCinema}
                onSelect={handleSelectCinema}
                onGetDirections={handleGetDirections}
                onViewSchedule={handleViewSchedule}
                loading={loading}
              />
            </div>
          </aside>

          {/* Map — chiếm toàn bộ chiều cao, không padding */}
          <main className="flex-1 overflow-hidden" aria-label="Bản đồ vị trí các rạp">
            <NearbyCinemaMap
              cinemas={mappableCinemas}
              selectedCinema={selectedCinema}
              userLocation={userLocation}
              routeCinema={routeCinema}
              onSelectCinema={handleMapSelectCinema}
              onRecenter={requestLocation}
            />
          </main>
        </div>

        {/* ── MOBILE: map (240px cố định) + list cuộn ── */}
        <div className="flex w-full flex-col lg:hidden overflow-hidden">
          {/* Map — nhỏ gọn trên mobile */}
          <div className="h-[240px] shrink-0 sm:h-[260px] overflow-hidden rounded-b-none">
            <NearbyCinemaMap
              cinemas={mappableCinemas}
              selectedCinema={selectedCinema}
              userLocation={userLocation}
              routeCinema={routeCinema}
              onSelectCinema={handleMapSelectCinema}
              onRecenter={requestLocation}
            />
          </div>

          {/* List — cuộn trong phần còn lại */}
          <div ref={mobileListRef} className="flex-1 overflow-y-auto p-2.5 pb-4 space-y-2">
            <CinemaList
              cinemas={filteredCinemas}
              selectedCinema={selectedCinema}
              onSelect={handleSelectCinema}
              onGetDirections={handleGetDirections}
              onViewSchedule={handleViewSchedule}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-component: CinemaList với các trạng thái ── */
function CinemaList({ cinemas, selectedCinema, onSelect, onGetDirections, onViewSchedule, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-dark-400" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải danh sách rạp...
      </div>
    )
  }
  if (cinemas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center animate-fade-in">
        <SearchX className="h-10 w-10 text-dark-600" aria-hidden="true" />
        <p className="text-sm font-medium text-dark-300">Không tìm thấy rạp</p>
        <p className="text-xs text-dark-500">Thử thay đổi từ khóa hoặc bộ lọc khác.</p>
      </div>
    )
  }

  const selectedIndex = cinemas.findIndex((cinema) => cinema.id === selectedCinema?.id)
  const orderedCinemas = selectedIndex > 0
    ? [cinemas[selectedIndex], ...cinemas.filter((_, index) => index !== selectedIndex)]
    : cinemas

  return (
    <>
      {orderedCinemas.map((cinema) => (
        <CinemaListItem
          key={cinema.id}
          cinema={cinema}
          isSelected={selectedCinema?.id === cinema.id}
          onSelect={() => onSelect(cinema)}
          onGetDirections={() => onGetDirections(cinema)}
          onViewSchedule={() => onViewSchedule(cinema.id)}
        />
      ))}
    </>
  )
}
