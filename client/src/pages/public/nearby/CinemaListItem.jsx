import { Clock, MapPin, Navigation, Phone, Ticket } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceKm } from '../../../utils/cinemaLocationUtils'

// Placeholder gradient khi ảnh bị lỗi hoặc không có ảnh
const FALLBACK_GRADIENTS = [
  'from-red-900/60 to-dark-800',
  'from-purple-900/60 to-dark-800',
  'from-blue-900/60 to-dark-800',
  'from-orange-900/60 to-dark-800',
  'from-teal-900/60 to-dark-800',
]

function CinemaImage({ cinema }) {
  const [imgError, setImgError] = useState(false)

  const gradientClass =
    FALLBACK_GRADIENTS[parseInt(String(cinema.id ?? '0').replace(/\D/g, '') || '0', 10) % FALLBACK_GRADIENTS.length]

  if (!cinema.imageUrl || imgError) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientClass}`}
        aria-hidden="true"
      >
        <span className="text-3xl">🎬</span>
      </div>
    )
  }

  return (
    <img
      src={cinema.imageUrl}
      alt={`Ảnh rạp ${cinema.name}`}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setImgError(true)}
    />
  )
}

/**
 * Thẻ rạp chiếu phim trong danh sách.
 *
 * Props:
 * - cinema: Object — dữ liệu rạp
 * - isSelected: boolean — đang được chọn hay không
 * - onSelect: () => void — callback khi click chọn
 * - onGetDirections: () => void — callback "Chỉ đường"
 * - onViewSchedule: () => void — callback "Xem suất chiếu"
 */
export default function CinemaListItem({
  cinema,
  isSelected,
  onSelect,
  onGetDirections,
  onViewSchedule,
}) {
  return (
    <article
      className={`group relative flex overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer
        ${
          isSelected
            ? 'border-blue-400/80 bg-blue-500/10 shadow-lg shadow-blue-950/30 ring-2 ring-blue-500/40'
            : 'border-dark-700/50 bg-dark-800/40 hover:border-dark-600/70 hover:bg-dark-800/60'
        }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Chọn rạp ${cinema.name}`}
    >
      {/* Indicator thanh trái khi đang chọn */}
      {isSelected && (
        <div className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-blue-500" aria-hidden="true" />
      )}

      {/* Ảnh rạp */}
      <div className="relative h-auto w-24 flex-shrink-0 overflow-hidden sm:w-28">
        <CinemaImage cinema={cinema} />
        {/* Badge "Có suất hôm nay" trên ảnh */}
        {cinema.hasShowtimesToday && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-green-600/90 py-0.5 text-center text-[10px] font-semibold text-white"
            aria-label="Rạp này có suất chiếu hôm nay"
          >
            Hôm nay
          </div>
        )}
      </div>

      {/* Nội dung */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3">
        {/* Header */}
        <div>
          <div className="flex items-start gap-2">
            <h3
              className={`flex-1 text-sm font-semibold leading-snug transition-colors ${
                isSelected ? 'text-blue-300' : 'text-white group-hover:text-red-300'
              }`}
            >
              {cinema.name}
            </h3>
          </div>

          <div className="mt-1 flex items-start gap-1.5 text-xs text-dark-500">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 leading-relaxed">{cinema.address}</span>
          </div>

          <div className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${
            cinema.distanceKm != null
              ? 'bg-blue-500/10 text-blue-300'
              : 'bg-dark-700/40 text-dark-500'
          }`}>
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            {cinema.distanceKm != null
              ? `Cách bạn ${formatDistanceKm(cinema.distanceKm)}`
              : 'Bật vị trí để xem khoảng cách'}
          </div>
        </div>

        {/* Suất chiếu + Phone */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dark-500">
          {cinema.nextShowtime ? (
            <span className="flex items-center gap-1 text-amber-400/90">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Suất gần nhất: <strong>{cinema.nextShowtime}</strong>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-dark-600 italic">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Chưa có suất hôm nay
            </span>
          )}

          {cinema.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" aria-hidden="true" />
              {cinema.phone}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onViewSchedule}
            aria-label={`Xem suất chiếu tại ${cinema.name}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg gradient-brand px-2 py-1.5 text-xs font-semibold text-white shadow-glow-sm transition-all hover:brightness-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-dark-800"
          >
            <Ticket className="h-3 w-3" aria-hidden="true" />
            Xem suất chiếu
          </button>
          <button
            onClick={onGetDirections}
            aria-label={`Chỉ đường đến ${cinema.name}`}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dark-600 bg-dark-700/50 px-2 py-1.5 text-xs font-medium text-dark-300 transition-all hover:border-dark-500 hover:bg-dark-700 hover:text-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-dark-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-dark-800"
          >
            <Navigation className="h-3 w-3" aria-hidden="true" />
            Chỉ đường
          </button>
        </div>
      </div>
    </article>
  )
}
