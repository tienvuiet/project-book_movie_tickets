import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export const registerSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  confirmPassword: z.string().min(8, 'Vui lòng xác nhận mật khẩu'),
  phone: z.string().min(1, 'Vui lòng nhập số điện thoại'),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu xác nhận không khớp' })
