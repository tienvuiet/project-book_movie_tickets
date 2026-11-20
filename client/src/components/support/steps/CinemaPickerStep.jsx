import { CheckCircle2, MapPin, Search, Wifi, WifiOff } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function CinemaPickerStep({ cinemas = [], loading = false, error = '', onRetry, onSelect, onConfirm }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return cinemas
    return cinemas.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortAddress.toLowerCase().includes(q)
    )
  }, [cinemas, query])

  const nearby = filtered.filter((c) => Number.isFinite(c.distanceKm) && c.distanceKm <= 5)
  const others = filtered.filter((c) => !Number.isFinite(c.distanceKm) || c.distanceKm > 5)

  const handleSelect = (cinema) => {
    setSelected(cinema)
    onSelect?.(cinema)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-700/50">
        <h2 className="text-base font-bold text-white leading-snug">
          Bạn muốn nhận hỗ trợ từ rạp nào?
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Chọn rạp để bắt đầu cuộc trò chuyện hỗ trợ
        </p>
        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên rạp hoặc khu vực..."
            className="w-full rounded-xl bg-slate-800/70 border border-slate-700/50 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
          />
        </div>
      </div>

      {/* Cinema List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading && <div className="py-10 text-center text-sm text-slate-500">Đang tải danh sách rạp…</div>}
        {!loading && error && (
          <div className="py-10 text-center">
            <p className="mb-3 text-sm text-red-400">{error}</p>
            <button onClick={onRetry} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Thử lại</button>
          </div>
        )}
        {!loading && !error && nearby.length > 0 && (
          <CinemaGroup
            title="Rạp gần bạn"
            cinemas={nearby}
            selected={selected}
            onSelect={handleSelect}
          />
        )}
        {!loading && !error && others.length > 0 && (
          <CinemaGroup
            title={nearby.length > 0 ? 'Tất cả rạp' : 'Danh sách rạp'}
            cinemas={others}
            selected={selected}
            onSelect={handleSelect}
          />
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-10 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">Không tìm thấy rạp phù hợp</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <button
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            enabled:gradient-brand enabled:text-white enabled:shadow-sm enabled:hover:brightness-110 enabled:active:scale-[0.98]"
        >
          Tiếp tục {selected && `→ ${selected.name}`}
        </button>
      </div>
    </div>
  )
}

function CinemaGroup({ title, cinemas, selected, onSelect }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
        {title}
      </p>
      <div className="space-y-2">
        {cinemas.map((cinema) => {
          const isSelected = selected?.id === cinema.id
          return (
            <button
              key={cinema.id}
              onClick={() => onSelect(cinema)}
              className={`w-full text-left rounded-xl border px-3.5 py-3 transition-all duration-150 flex items-start gap-3 group ${
                isSelected
                  ? 'border-red-500/50 bg-red-500/10 ring-1 ring-red-500/20'
                  : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
            >
              {/* Icon */}
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? 'bg-red-500/20' : 'bg-slate-700/60 group-hover:bg-slate-700'
                }`}
              >
                <MapPin
                  className={`h-4 w-4 ${isSelected ? 'text-red-400' : 'text-slate-400'}`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-snug ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {cinema.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{cinema.shortAddress}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {cinema.distance && <span className="text-[10px] text-slate-500">{cinema.distance}</span>}
                  <span
                    className={`flex items-center gap-1 text-[10px] font-medium ${
                      cinema.online === true ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {cinema.online === true ? (
                      <><Wifi className="h-3 w-3" />Đang trực tuyến</>
                    ) : cinema.online === false ? (
                      <><WifiOff className="h-3 w-3" />Hiện không có nhân viên trực</>
                    ) : (
                      <><Wifi className="h-3 w-3" />Sẵn sàng nhận yêu cầu</>
                    )}
                  </span>
                </div>
              </div>

              {/* Checkmark */}
              {isSelected && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
