import { describe, expect, it } from 'vitest'
import { buildTicketQrPayload, parseTicketQrPayload } from './ticketQr'

describe('ticket QR payload', () => {
  it('round-trips the booking and payment information', () => {
    const encoded = buildTicketQrPayload({
      id: 12,
      bookingCode: 'BK12',
      status: 'PAID',
      paymentStatus: 'SUCCESS',
      paymentMethod: 'PAYOS',
      totalAmount: 120000,
      paymentTime: '2026-07-21T10:00:00',
      transactionId: 'PAYOS-REF',
      movieTitle: 'Demo Movie',
      cinemaName: 'Cinema 1',
      roomName: 'Room 1',
      startTime: '2026-07-21T18:00:00',
      seats: [{ row: 'A', number: 1 }],
    }, 12)

    const decoded = parseTicketQrPayload(encoded)
    expect(decoded.bookingCode).toBe('BK12')
    expect(decoded.payment.amount).toBe(120000)
    expect(decoded.seats).toEqual(['A1'])
  })

  it('rejects a forged or unrelated JSON QR', () => {
    expect(() => parseTicketQrPayload(JSON.stringify({ type: 'OTHER', bookingCode: 'BK12' })))
      .toThrow('QR không phải vé CGV Cinemas')
  })
})
