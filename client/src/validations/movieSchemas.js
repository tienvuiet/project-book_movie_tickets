import { z } from 'zod'

export const movieSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tên phim'),
  durationMinutes: z.coerce.number().positive('Thời lượng phải lớn hơn 0'),
  genreId: z.string().min(1, 'Vui lòng chọn thể loại'),
})

export const showtimeSchema = z.object({
  movieId: z.string().min(1, 'Vui lòng chọn phim'),
  roomId: z.string().min(1, 'Vui lòng chọn phòng'),
  startTime: z.string().min(1, 'Vui lòng chọn giờ chiếu'),
  basePrice: z.coerce.number().positive('Giá vé phải lớn hơn 0'),
})

export const bookingSchema = z.object({
  seatIds: z.array(z.number()).min(1, 'Vui lòng chọn ít nhất 1 ghế'),
})
