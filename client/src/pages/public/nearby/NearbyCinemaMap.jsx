import L from 'leaflet'
import { LocateFixed } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDistanceKm } from '../../../utils/cinemaLocationUtils'

const DEFAULT_CENTER = [10.7769, 106.7009]

function isValidCoordinate(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

const cinemaIcon = L.divIcon({
  className: '',
  html: '<div style="display:grid;place-items:center;width:34px;height:34px;border:3px solid white;border-radius:50% 50% 50% 0;background:#dc2626;color:white;font-size:17px;box-shadow:0 4px 14px rgba(0,0,0,.45);transform:rotate(-45deg)"><span style="transform:rotate(45deg)">🎬</span></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
})

const selectedCinemaIcon = L.divIcon({
  className: '',
  html: '<div style="display:grid;place-items:center;width:42px;height:42px;border:4px solid white;border-radius:50% 50% 50% 0;background:#991b1b;color:white;font-size:20px;box-shadow:0 0 0 5px rgba(239,68,68,.25),0 5px 18px rgba(0,0,0,.55);transform:rotate(-45deg)"><span style="transform:rotate(45deg)">🎬</span></div>',
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -42],
})

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border:4px solid white;border-radius:50%;background:#2563eb;box-shadow:0 0 0 7px rgba(37,99,235,.2),0 3px 10px rgba(0,0,0,.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function MapViewport({ cinemas, selectedCinema, userLocation }) {
  const map = useMap()
  const container = map.getContainer()

  useEffect(() => {
    const refreshSize = () => map.invalidateSize({ pan: false })
    const frame = window.requestAnimationFrame(refreshSize)
    const observer = new ResizeObserver(refreshSize)
    observer.observe(container)
    window.addEventListener('resize', refreshSize)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', refreshSize)
    }
  }, [container, map])

  useEffect(() => {
    if (selectedCinema && isValidCoordinate(selectedCinema.latitude, selectedCinema.longitude)) {
      map.setView([Number(selectedCinema.latitude), Number(selectedCinema.longitude)], 15, { animate: true })
      return
    }

    const points = cinemas
      .filter((cinema) => isValidCoordinate(cinema.latitude, cinema.longitude))
      .map((cinema) => [Number(cinema.latitude), Number(cinema.longitude)])
    if (userLocation && isValidCoordinate(userLocation.lat, userLocation.lng)) {
      points.push([Number(userLocation.lat), Number(userLocation.lng)])
    }
    if (points.length === 1) map.setView(points[0], 14)
    else if (points.length > 1) map.fitBounds(points, { padding: [50, 50], maxZoom: 15 })
  }, [cinemas, map, selectedCinema, userLocation])

  return null
}

function RouteViewport({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [55, 55] })
  }, [map, positions])
  return null
}

export default function NearbyCinemaMap({ cinemas, selectedCinema, userLocation, routeCinema, onSelectCinema, onRecenter }) {
  const [route, setRoute] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const routeRequestId = useRef(0)
  const center = useMemo(
    () => userLocation ? [userLocation.lat, userLocation.lng] : DEFAULT_CENTER,
    [userLocation],
  )

  useEffect(() => {
    if (!routeCinema) {
      setRoute(null)
      setRouteLoading(false)
      setRouteError('')
      return
    }
    if (!isValidCoordinate(routeCinema.latitude, routeCinema.longitude)) {
      setRoute(null)
      setRouteLoading(false)
      setRouteError('Rạp chưa có tọa độ để chỉ đường.')
      return
    }
    if (!userLocation || !isValidCoordinate(userLocation.lat, userLocation.lng)) {
      setRoute(null)
      setRouteLoading(false)
      setRouteError('Vui lòng cấp quyền vị trí để vẽ tuyến đường, hoặc mở Google Maps.')
      return
    }

    const controller = new AbortController()
    const requestId = ++routeRequestId.current
    const coordinates = `${userLocation.lng},${userLocation.lat};${routeCinema.longitude},${routeCinema.latitude}`
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`
    setRouteLoading(true)
    setRouteError('')
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Không thể tải tuyến đường.')
        return response.json()
      })
      .then((data) => {
        if (requestId !== routeRequestId.current) return
        const result = data.routes?.[0]
        if (!result?.geometry?.coordinates) throw new Error('Không tìm thấy tuyến đường phù hợp.')
        setRoute({
          positions: result.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          distanceKm: result.distance / 1000,
          durationMinutes: Math.ceil(result.duration / 60),
        })
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && requestId === routeRequestId.current) {
          setRoute(null)
          setRouteError(error.message)
        }
      })
      .finally(() => {
        if (requestId === routeRequestId.current) setRouteLoading(false)
      })

    return () => {
      controller.abort()
      routeRequestId.current += 1
    }
  }, [routeCinema, userLocation])

  const externalDirectionsUrl = routeCinema && isValidCoordinate(routeCinema.latitude, routeCinema.longitude)
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${routeCinema.latitude},${routeCinema.longitude}`)}&travelmode=driving`
    : null

  return (
    <div className="relative isolate z-0 h-full overflow-hidden bg-dark-900">
      <MapContainer center={center} zoom={12} className="relative z-0 h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport cinemas={cinemas} selectedCinema={selectedCinema} userLocation={userLocation} />
        {route?.positions && (
          <>
            <Polyline positions={route.positions} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }} />
            <RouteViewport positions={route.positions} />
          </>
        )}

        {userLocation && isValidCoordinate(userLocation.lat, userLocation.lng) && (
          <Marker position={[Number(userLocation.lat), Number(userLocation.lng)]} icon={userIcon} zIndexOffset={1000}>
            <Popup><strong>Vị trí hiện tại của bạn</strong></Popup>
          </Marker>
        )}

        {cinemas.filter((cinema) => isValidCoordinate(cinema.latitude, cinema.longitude)).map((cinema) => (
          <Marker
            key={cinema.id}
            position={[Number(cinema.latitude), Number(cinema.longitude)]}
            icon={selectedCinema?.id === cinema.id ? selectedCinemaIcon : cinemaIcon}
            zIndexOffset={selectedCinema?.id === cinema.id ? 500 : 0}
            eventHandlers={{ click: () => onSelectCinema(cinema) }}
          >
            <Popup>
              <div className="min-w-44 space-y-1 text-sm">
                <strong className="block text-base">{cinema.name}</strong>
                <span className="block text-slate-600 text-xs">{cinema.address}</span>
                {cinema.distanceKm != null && (
                  <span className="block font-medium text-red-600 text-xs">
                    Cách bạn {formatDistanceKm(cinema.distanceKm)}
                  </span>
                )}
                {cinema.nextShowtime && (
                  <span className="block text-xs">Suất gần nhất: {cinema.nextShowtime}</span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Route info — nhỏ gọn */}
      {(routeLoading || route || routeError) && (
        <div className="absolute left-3 top-3 z-[500] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md backdrop-blur">
          {routeLoading && <span>Đang tìm tuyến đường...</span>}
          {route && (
            <span>
              <strong>{route.distanceKm.toFixed(1)} km</strong> · ~{route.durationMinutes} phút
            </span>
          )}
          {routeError && (
            <div className="flex max-w-72 items-center gap-2">
              <span className="text-red-600">{routeError}</span>
              {externalDirectionsUrl && (
                <a
                  href={externalDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 font-semibold text-blue-600 underline hover:text-blue-700"
                >
                  Mở bản đồ
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recenter button — nhỏ gọn */}
      <button
        type="button"
        onClick={onRecenter}
        className="absolute bottom-3 right-3 z-[500] rounded-lg bg-white p-2 text-slate-600 shadow-md transition hover:bg-slate-100"
        aria-label="Cập nhật vị trí hiện tại"
      >
        <LocateFixed className="h-4 w-4" />
      </button>
    </div>
  )
}
