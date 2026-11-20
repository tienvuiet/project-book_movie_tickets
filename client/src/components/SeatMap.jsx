import { useMemo } from 'react'
import clsx from 'clsx'

const typeStyle = {
  NORMAL: 'border-dark-600',
  VIP: 'border-amber-500/60',
  COUPLE: 'border-pink-500/60',
}

export default function SeatMap({ seats = [], selectedIds = [], onToggle }) {
  const selected = new Set(selectedIds)

  // Group seats by row, preserving order
  const rows = useMemo(() => {
    const map = new Map()
    for (const seat of seats) {
      const row = seat.row || '?'
      if (!map.has(row)) map.set(row, [])
      map.get(row).push(seat)
    }
    for (const [, rowSeats] of map) {
      rowSeats.sort((a, b) => a.number - b.number)
    }
    return Array.from(map.entries())
  }, [seats])

  return (
    <div className="rounded-2xl glass animate-fade-in overflow-hidden">
      {/* Screen */}
      <div className="pt-5 pb-2 text-center px-4">
        <div className="mx-auto h-1.5 w-2/3 rounded-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
        <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-dark-600">Màn hình</p>
      </div>

      {/* Seat grid — scroll ngang khi cần */}
      <div className="overflow-x-auto pb-3 px-3 sm:px-5">
        <div className="flex min-w-max justify-center">
          <div className="flex w-fit flex-col items-center gap-1.5 sm:gap-2">
            {rows.map(([rowLabel, rowSeats]) => (
              <div key={rowLabel} className="flex items-center justify-center gap-1.5 sm:gap-2">
                {/* Row label trái */}
                <span className="w-5 shrink-0 text-center text-[10px] font-bold text-dark-600 sm:w-7 sm:text-xs sm:text-dark-500">
                  {rowLabel}
                </span>

                {/* Ghế */}
                <div className="flex gap-1 sm:gap-1.5">
                  {rowSeats.map((seat) => {
                    const isInactive = seat.status === 'INACTIVE' || seat.active === false
                    const isHeld = seat.status === 'HELD' || seat.status === 'PENDING'
                    const isBooked = seat.status === 'BOOKED' || seat.status === 'PAID'
                    const disabled = isInactive || isHeld || isBooked
                    const active = selected.has(seat.id)
                    const isCouple = (seat.type || 'NORMAL') === 'COUPLE'

                    return (
                      <button
                        key={seat.id}
                        disabled={disabled}
                        onClick={() => onToggle?.(seat)}
                        title={`${seat.row}${seat.number} - ${seat.type || 'NORMAL'}`}
                        aria-label={`Ghế ${seat.row}${seat.number} loại ${seat.type || 'NORMAL'}${active ? ' (đang chọn)' : ''}`}
                        aria-pressed={active}
                        className={clsx(
                          // Kích thước: nhỏ hơn trên mobile, bình thường trên sm+
                          'rounded border text-[9px] font-semibold transition-all duration-150 flex items-center justify-center',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60',
                          isCouple
                            ? 'h-6 w-12 sm:h-8 sm:w-16'
                            : 'h-6 w-6 sm:h-8 sm:w-8',
                          // Text size
                          'text-[9px] sm:text-xs',
                          typeStyle[seat.type || 'NORMAL'],
                          isInactive && 'cursor-not-allowed bg-dark-900/50 text-dark-700 border-dark-800/30 line-through',
                          isHeld && !isInactive && 'cursor-not-allowed bg-amber-500/15 text-amber-300 border-amber-500/40',
                          isBooked && !isInactive && 'cursor-not-allowed bg-dark-700/50 text-dark-600 border-dark-700/30',
                          active && 'gradient-accent text-white border-transparent shadow-glow-accent scale-95',
                          !disabled && !active && 'bg-dark-800/40 text-dark-400 hover:bg-dark-700/60 hover:text-dark-200 hover:scale-95 active:scale-90',
                        )}
                      >
                        {seat.row}{seat.number}
                      </button>
                    )
                  })}
                </div>

                {/* Row label phải */}
                <span className="w-5 shrink-0 text-center text-[10px] font-bold text-dark-600 sm:w-7 sm:text-xs sm:text-dark-500">
                  {rowLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2.5 border-t border-dark-800/40 px-4 py-3 text-[10px] text-dark-500 sm:gap-4 sm:text-xs">
        <span className="inline-flex items-center gap-1">
          <span className="h-3.5 w-3.5 rounded border border-dark-600 bg-dark-800/40 sm:h-4 sm:w-4" />
          Thường
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3.5 w-3.5 rounded border border-amber-500/60 bg-dark-800/40 sm:h-4 sm:w-4" />
          VIP
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3.5 w-7 rounded border border-pink-500/60 bg-dark-800/40 sm:h-4 sm:w-8" />
          Ghế đôi
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3.5 w-3.5 rounded gradient-accent sm:h-4 sm:w-4" />
          Đang chọn
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3.5 w-3.5 rounded bg-amber-500/15 border border-amber-500/40 sm:h-4 sm:w-4" />
          Đang giữ
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3.5 w-3.5 rounded bg-dark-700/50 border border-dark-700/30 sm:h-4 sm:w-4" />
          Đã đặt
        </span>
      </div>
    </div>
  )
}
