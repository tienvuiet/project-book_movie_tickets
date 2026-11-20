import axiosClient from '../api/axiosClient'

const datePart = (value) => value?.slice(0, 10)
const localDatePart = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loadOperationalData() {
  const [showtimeResponse, bookingResponse] = await Promise.all([
    axiosClient.get('/showtimes/staff'),
    axiosClient.get('/bookings/staff'),
  ])
  return {
    showtimes: showtimeResponse.data || [],
    bookings: bookingResponse.data || [],
  }
}

const staffService = {
  getDashboard: async () => {
    const { showtimes, bookings } = await loadOperationalData()
    const now = new Date()
    const today = localDatePart(now)
    const todayShowtimes = showtimes.filter((showtime) => datePart(showtime.startTime) === today)
    const soldByShowtime = new Map()
    bookings.filter((booking) => ['PAID', 'COMPLETED'].includes(booking.status)).forEach((booking) => {
      soldByShowtime.set(booking.showtimeId, (soldByShowtime.get(booking.showtimeId) || 0) + (booking.seatCount || 0))
    })
    const upcomingShowtimes = todayShowtimes
      .filter((showtime) => showtime.status !== 'CANCELLED' && new Date(showtime.startTime) >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 6)
      .map((showtime) => ({
        ...showtime,
        moviePoster: showtime.moviePosterUrl,
        soldSeats: soldByShowtime.get(showtime.id) || 0,
      }))
    const checkedInToday = bookings.filter((booking) => booking.checkedInAt && datePart(booking.checkedInAt) === today)
    const recentCheckins = checkedInToday
      .filter((booking) => booking.checkedInAt && datePart(booking.checkedInAt) === today)
      .sort((a, b) => new Date(b.checkedInAt) - new Date(a.checkedInAt))
      .slice(0, 8)
      .map((booking) => ({ ...booking, checkinTime: booking.checkedInAt }))
    return {
      data: {
        cinemaName: showtimes[0]?.cinemaName,
        stats: {
          checkedInToday: checkedInToday.length,
          pendingCheckin: bookings.filter((booking) => booking.status === 'PAID' && datePart(booking.startTime) === today).length,
          showtimesToday: todayShowtimes.length,
          upcomingShowtimes: upcomingShowtimes.length,
        },
        upcomingShowtimes,
        recentCheckins,
      },
    }
  },
  getSchedule: async (date) => {
    const { showtimes, bookings } = await loadOperationalData()
    const selected = showtimes.filter((showtime) => datePart(showtime.startTime) === date)
    const result = selected.map((showtime) => ({
      ...showtime,
      moviePoster: showtime.moviePosterUrl,
      soldSeats: bookings
        .filter((booking) => booking.showtimeId === showtime.id && ['PAID', 'COMPLETED'].includes(booking.status))
        .reduce((sum, booking) => sum + (booking.seatCount || 0), 0),
    }))
    return { data: result }
  },
}

export default staffService
