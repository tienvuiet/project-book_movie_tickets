import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { z } from 'zod'
import AuthField from '../../components/auth/AuthField'
import AuthSubmitButton from '../../components/auth/AuthSubmitButton'
import { register as registerUser } from '../../store/authSlice'

const localRegisterSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại')
    .regex(/^(?:\+84|0)\d{9}$/, 'Số điện thoại không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
})

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(localRegisterSchema) })

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, phone: values.phone.trim(), confirmPassword: values.password }
      await dispatch(registerUser(payload)).unwrap()
      navigate('/login')
    } catch (err) {
      setError('root.server', { message: err?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.' })
    }
  }

  return (
    <>
      <div className="auth-heading">
        <h1>Tạo tài khoản</h1>
        <p>Một tài khoản cho những cuộc hẹn tại rạp.</p>
      </div>
      <form className="auth-form auth-register-form" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Đăng ký">
        {errors.root?.server && <p className="auth-root-error" role="alert">{errors.root.server.message}</p>}
        <AuthField id="register-name" label="Họ và tên" autoComplete="name" placeholder="Nguyễn Minh Anh" registration={register('fullName')} error={errors.fullName?.message} required />
        <AuthField id="register-email" label="Email" type="email" autoComplete="email" placeholder="ban@example.com" registration={register('email')} error={errors.email?.message} required />
        <AuthField id="register-phone" label="Số điện thoại" type="tel" inputMode="tel" autoComplete="tel" maxLength={12} placeholder="0912345678" registration={register('phone')} error={errors.phone?.message} required />
        <AuthField id="register-password" label="Mật khẩu" type="password" autoComplete="new-password" placeholder="Ít nhất 8 ký tự" hint="Sử dụng ít nhất 8 ký tự." registration={register('password')} error={errors.password?.message} required />
        <AuthSubmitButton loading={isSubmitting} pendingText="Đang tạo tài khoản…">Đăng ký</AuthSubmitButton>
      </form>
      <p className="auth-switch-note">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </>
  )
}
