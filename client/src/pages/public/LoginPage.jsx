import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import AuthField from '../../components/auth/AuthField'
import AuthSubmitButton from '../../components/auth/AuthSubmitButton'
import { loginSchema } from '../../validations/authSchemas'
import { login } from '../../store/authSlice'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values) => {
    try {
      await dispatch(login(values)).unwrap()
      navigate('/', { replace: true })
    } catch (err) {
      const message = err?.status === 401 || err?.errorCode === 'UNAUTHORIZED'
        ? 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.'
        : err?.message || 'Không thể đăng nhập. Vui lòng thử lại.'
      setError('root.server', { message })
      toast.error(message, { id: 'login-error' })
    }
  }

  return (
    <>
      <div className="auth-heading">
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập để tiếp tục đặt vé của bạn.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Đăng nhập">
        {errors.root?.server && <p className="auth-root-error" role="alert">{errors.root.server.message}</p>}
        <AuthField id="login-email" label="Email" type="email" autoComplete="email" placeholder="ban@example.com" registration={register('email')} error={errors.email?.message} required />
        <AuthField id="login-password" label="Mật khẩu" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu của bạn" registration={register('password')} error={errors.password?.message} required />
        <div className="auth-forgot"><Link to="/forgot-password">Quên mật khẩu?</Link></div>
        <AuthSubmitButton loading={isSubmitting} pendingText="Đang đăng nhập…">Đăng nhập</AuthSubmitButton>
      </form>
      <p className="auth-switch-note">Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
    </>
  )
}
