export const TICKET_QR_TYPE = 'CINEMA_BOOKING_TICKET'

export function buildTicketQrPayload(booking, bookingId) {
  return JSON.stringify({
    version: 1,
    type: TICKET_QR_TYPE,
    bookingId: booking.id || Number(bookingId),
    bookingCode: booking.bookingCode,
    bookingStatus: booking.status,
    payment: {
      status: booking.paymentStatus || 'SUCCESS',
      method: booking.paymentMethod || 'PAYOS',
      amount: booking.totalAmount,
      paidAt: booking.paymentTime,
      transactionId: booking.transactionId,
    },
    movie: booking.movieTitle,
    cinema: booking.cinemaName,
    room: booking.roomName,
    showtime: booking.startTime,
    seats: booking.seats?.map((seat) => `${seat.row}${seat.number}`) || [],
  })
}

export function parseTicketQrPayload(decodedText) {
  const payload = JSON.parse(decodedText)
  if (payload.type !== TICKET_QR_TYPE || typeof payload.bookingCode !== 'string' || !payload.bookingCode.trim()) {
    throw new Error('QR không phải vé CGV Cinemas')
  }
  return { ...payload, bookingCode: payload.bookingCode.trim().toUpperCase() }
}
