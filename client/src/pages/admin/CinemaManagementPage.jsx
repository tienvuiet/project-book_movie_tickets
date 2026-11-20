import { useState } from 'react'
import { Building2, DoorOpen, Armchair, ChevronRight } from 'lucide-react'
import CinemaList from '../../components/admin/CinemaList'
import RoomList from '../../components/admin/RoomList'
import SeatManager from '../../components/admin/SeatManager'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'

/**
 * Orchestrator page for 3-level management: Cinemas → Rooms → Seats.
 * - Desktop: full-width, drill-down navigation with breadcrumbs
 * - Mobile: sequential step flow with back buttons
 */
export default function CinemaManagementPage() {
  const { user, roles } = useAuth()
  const isAdmin = roles.includes(ROLES.ADMIN)
  const [selectedCinema, setSelectedCinema] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)

  // Determine current view based on selection state
  const view = selectedRoom ? 'seats' : selectedCinema ? 'rooms' : 'cinemas'

  const handleSelectCinema = (cinema) => {
    setSelectedCinema(cinema)
    setSelectedRoom(null)
  }

  const handleSelectRoom = (room) => {
    setSelectedRoom(room)
  }

  const handleBackToCinemas = () => {
    setSelectedCinema(null)
    setSelectedRoom(null)
  }

  const handleBackToRooms = () => {
    setSelectedRoom(null)
  }

  return (
    <section className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý rạp, phòng, ghế</h1>
          {/* Mini breadcrumb for context */}
          <div className="mt-1 flex items-center gap-1.5 text-sm text-dark-400">
            <button
              onClick={handleBackToCinemas}
              className={`flex items-center gap-1 transition hover:text-white ${view === 'cinemas' ? 'text-white font-medium' : ''}`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Rạp
            </button>
            {(view === 'rooms' || view === 'seats') && (
              <>
                <ChevronRight className="h-3 w-3 text-dark-600" />
                <button
                  onClick={handleBackToRooms}
                  className={`flex items-center gap-1 transition hover:text-white ${view === 'rooms' ? 'text-white font-medium' : ''}`}
                >
                  <DoorOpen className="h-3.5 w-3.5" />
                  Phòng
                </button>
              </>
            )}
            {view === 'seats' && (
              <>
                <ChevronRight className="h-3 w-3 text-dark-600" />
                <span className="flex items-center gap-1 text-white font-medium">
                  <Armchair className="h-3.5 w-3.5" />
                  Ghế
                </span>
              </>
            )}
          </div>
        </div>

        {/* Context chips */}
        <div className="flex flex-wrap gap-2">
          {selectedCinema && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-red-400" />
              <span className="text-dark-300">{selectedCinema.name}</span>
            </div>
          )}
          {selectedRoom && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-1.5 text-xs">
              <DoorOpen className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-dark-300">{selectedRoom.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      {view === 'cinemas' && (
        <CinemaList
          onSelectCinema={handleSelectCinema}
          selectedCinemaId={selectedCinema?.id}
          allowedCinemaId={isAdmin ? null : user?.cinemaId}
          isAdmin={isAdmin}
        />
      )}

      {view === 'rooms' && selectedCinema && (
        <RoomList
          cinema={selectedCinema}
          onSelectRoom={handleSelectRoom}
          onBack={handleBackToCinemas}
          canDelete={false}
        />
      )}

      {view === 'seats' && selectedCinema && selectedRoom && (
        <SeatManager
          cinema={selectedCinema}
          room={selectedRoom}
          onBack={handleBackToRooms}
          canDelete={isAdmin}
        />
      )}
    </section>
  )
}
