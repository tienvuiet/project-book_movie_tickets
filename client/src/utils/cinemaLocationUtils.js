/**
 * Tính khoảng cách (km) giữa hai toạ độ địa lý bằng công thức Haversine.
 * @param {{ lat: number, lng: number }} origin - Toạ độ xuất phát
 * @param {{ lat: number, lng: number }} destination - Toạ độ đích
 * @returns {number} Khoảng cách tính bằng km
 */
export function calculateDistanceKm(origin, destination) {
  const R = 6371 // Bán kính Trái Đất (km)
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(destination.lat - origin.lat)
  const dLng = toRad(destination.lng - origin.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) *
      Math.cos(toRad(destination.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Định dạng khoảng cách ra chuỗi hiển thị.
 * @param {number} km - Khoảng cách tính bằng km
 * @returns {string} Ví dụ: "2,4 km" hoặc "850 m"
 */
export function formatDistanceKm(km) {
  if (km == null || isNaN(km)) return '—'
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1).replace('.', ',')} km`
}

/**
 * Mở OpenStreetMap chỉ đường đến tọa độ đích trong tab mới.
 * Không cần API key.
 * @param {number} lat - Vĩ độ đích
 * @param {number} lng - Kinh độ đích
 */
/**
 * Sắp xếp danh sách rạp theo tiêu chí.
 * @param {Array} cinemas - Danh sách rạp
 * @param {'nearest'|'az'|'today'} sortBy - Tiêu chí sắp xếp
 * @param {{ lat: number, lng: number } | null} userLocation - Vị trí người dùng
 * @returns {Array} Danh sách rạp đã lọc và sắp xếp
 */
export function sortCinemas(cinemas, sortBy, userLocation) {
  let result = [...cinemas]

  if (sortBy === 'today') {
    result = result.filter((c) => c.hasShowtimesToday)
  }

  if (sortBy === 'nearest') {
    result.sort((a, b) => {
      const distA = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY
      const distB = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY
      return distA - distB
    })
  } else if (sortBy === 'az') {
    result.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }

  return result
}
