import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Mail, ShieldCheck } from 'lucide-react'
import authService from '../../services/authService'
import { friendlyError } from '../../utils/errorMapper'
import Button from '../../components/Button'
import Notification from '../../components/Notification'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const sendOtp = async (event) => {
    event.preventDefault(); setLoading(true); setMessage(null)
    try {
      await authService.forgotPassword(form.email.trim())
      setStep(2)
      setMessage({ type: 'success', text: 'Nếu Gmail đã đăng ký, mã OTP đã được gửi. Mã có hiệu lực 5 phút.' })
    } catch (error) { setMessage({ type: 'error', text: friendlyError(error) }) }
    finally { setLoading(false) }
  }

  const resetPassword = async (event) => {
    event.preventDefault(); setMessage(null)
    if (form.newPassword.length < 6) return setMessage({ type: 'error', text: 'Mật khẩu cần ít nhất 6 ký tự.' })
    if (form.newPassword !== form.confirmPassword) return setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
    setLoading(true)
    try {
      await authService.resetPassword({ email: form.email.trim(), otp: form.otp, newPassword: form.newPassword })
      setMessage({ type: 'success', text: 'Đặt lại mật khẩu thành công. Đang chuyển đến đăng nhập...' })
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (error) { setMessage({ type: 'error', text: friendlyError(error) }) }
    finally { setLoading(false) }
  }

  const inputClass = 'w-full rounded-xl border border-dark-700 bg-dark-900/70 px-4 py-3 text-white outline-none transition focus:border-red-500/70'
  return (
    <div className="w-full max-w-md rounded-3xl border border-dark-700/60 bg-dark-900/90 p-7 shadow-2xl">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
        {step === 1 ? <Mail /> : <ShieldCheck />}
      </div>
      <h1 className="text-2xl font-bold text-white">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-dark-400">{step === 1 ? 'Nhập Gmail đã đăng ký để nhận mã OTP.' : `Nhập mã OTP đã gửi tới ${form.email}.`}</p>
      {message && <div className="mt-5"><Notification type={message.type} message={message.text} /></div>}

      {step === 1 ? (
        <form onSubmit={sendOtp} className="mt-6 space-y-4">
          <input className={inputClass} name="email" type="email" autoComplete="email" placeholder="Gmail của bạn" value={form.email} onChange={change} required />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi mã OTP'}</Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-6 space-y-4">
          <input className={`${inputClass} text-center text-xl tracking-[.45em]`} name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={form.otp} onChange={(e) => setForm((cur) => ({ ...cur, otp: e.target.value.replace(/\D/g, '') }))} required />
          <input className={inputClass} name="newPassword" type="password" autoComplete="new-password" placeholder="Mật khẩu mới" value={form.newPassword} onChange={change} required />
          <input className={inputClass} name="confirmPassword" type="password" autoComplete="new-password" placeholder="Xác nhận mật khẩu mới" value={form.confirmPassword} onChange={change} required />
          <Button type="submit" className="w-full" disabled={loading}><KeyRound size={16} />{loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}</Button>
          <button type="button" className="w-full text-sm text-dark-400 hover:text-red-400" onClick={() => { setStep(1); setMessage(null) }}>Gửi lại OTP</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-dark-400"><Link className="text-red-400 hover:text-red-300" to="/login">Quay lại đăng nhập</Link></p>
    </div>
  )
}
