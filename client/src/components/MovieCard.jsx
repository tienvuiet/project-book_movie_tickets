import { Calendar, Clock, Star, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '../utils/formatters'

export default function MovieCard({ movie, badge, showReleaseDate = false }) {
  const releaseDateLabel = movie.releaseDate ? formatDate(movie.releaseDate) : null

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl glass transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg h-full">
      {/* Poster — fixed aspect ratio 2:3 */}
      <div className="relative aspect-[2/3] w-full flex-shrink-0 overflow-hidden bg-dark-800">
        {/*
          Bao toàn bộ poster bằng Link để mobile có thể tap vào bất kỳ đâu để xem chi tiết.
          Desktop: Link vẫn hoạt động, hover overlay hiện ra trên cùng.
        */}
        <Link
          to={`/movies/${movie.id}`}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
          aria-label={`Xem chi tiết phim ${movie.title}`}
          tabIndex={0}
        >
          <img
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={
              movie.posterUrl ||
              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80'
            }
            alt={`Poster phim ${movie.title}`}
            loading="lazy"
          />
        </Link>

        {/* Gradient overlay — desktop hover */}
        <div className="movie-hover-overlay absolute inset-0 bg-gradient-to-t from-dark-950/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

        {/* Desktop hover action — ẩn trên thiết bị cảm ứng */}
        <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
          <Link
            to={`/movies/${movie.id}`}
            className="flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Ticket className="h-4 w-4" />
            Đặt vé
          </Link>
        </div>

        {/* Mobile CTA strip — luôn hiển thị ở dưới cùng poster trên thiết bị cảm ứng */}
        <Link
          to={`/movies/${movie.id}`}
          className="movie-touch-cta absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent pt-6 pb-2 text-xs font-semibold text-red-400 opacity-0 sm:hidden"
          aria-label={`Đặt vé xem phim ${movie.title}`}
        >
          <Ticket className="h-3.5 w-3.5 shrink-0" />
          Xem & Đặt vé
        </Link>

        {/* Rating badge */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-dark-950/70 backdrop-blur-sm px-2 py-1 text-xs font-semibold text-amber-300 pointer-events-none">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          8.5
        </div>

        {/* Optional status badge */}
        {badge && (
          <div className="absolute right-2.5 top-2.5 rounded-lg bg-amber-500/90 px-2 py-1 text-xs font-bold text-white shadow-lg pointer-events-none">
            {badge}
          </div>
        )}

        {/* Release date overlay — shown on upcoming movies */}
        {showReleaseDate && releaseDateLabel && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-950 to-transparent px-3 pt-8 pb-2.5 pointer-events-none">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Công chiếu: {releaseDateLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between gap-1.5 p-3 sm:p-3.5 h-[80px] sm:h-[88px]">
        <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold leading-snug text-white group-hover:text-red-300 transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-dark-500">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{movie.durationMinutes || 120} phút</span>
          </div>
          {/* For currently showing movies, display release date inline */}
          {!showReleaseDate && releaseDateLabel ? (
            <div className="flex items-center gap-1 text-xs text-dark-500 truncate max-w-[60%]">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{releaseDateLabel}</span>
            </div>
          ) : movie.genres?.length ? (
            <p className="truncate text-xs text-dark-500 text-right max-w-[60%]">
              {movie.genres.map((genre) => genre.name).join(' • ')}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
