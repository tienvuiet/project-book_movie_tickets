import { useState } from 'react'
import { KeyRound, Mail, Phone, Shield, User, CheckCircle2, Eye, EyeOff, Sparkles, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import authService from '../../services/authService'
import { friendlyError } from '../../utils/errorMapper'
import Button from '../../components/Button'

/* ---------- Password strength helpers ---------- */
function getStrength(pwd) {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

const strengthLabel = ['', 'Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh']
const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

/* ---------- Custom password input ---------- */
function PasswordInput({ label, hint, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="profile-field-group">
      <label className="profile-input-label">
        {label}
        {hint && <span className="profile-input-hint">{hint}</span>}
      </label>
      <div className="profile-input-wrap">
        <Lock className="profile-input-icon" />
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className="profile-input"
        />
        <button
          type="button"
          className="profile-input-eye"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const strength = getStrength(passwords.newPassword)

  const change = (e) => {
    const { name, value } = e.target
    setPasswords((cur) => ({ ...cur, [name]: value }))
    setDone(false)
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setDone(false)

    if (passwords.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không khớp.')
      return
    }

    setSubmitting(true)
    try {
      await authService.changePassword({ oldPassword: passwords.oldPassword, newPassword: passwords.newPassword })
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Đổi mật khẩu thành công!')
      setDone(true)
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const initials = user?.fullName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const roleColors = { ADMIN: '#a855f7', STAFF: '#3b82f6', CUSTOMER: '#22c55e' }
  const primaryRole = user?.roles?.[0] || 'CUSTOMER'
  const roleColor = roleColors[primaryRole] || '#22c55e'

  const infoFields = [
    { icon: User, label: 'Họ và tên', value: user?.fullName, color: '#ef4444' },
    { icon: Mail, label: 'Địa chỉ email', value: user?.email, color: '#3b82f6' },
    { icon: Phone, label: 'Số điện thoại', value: user?.phone, color: '#22c55e' },
    { icon: Shield, label: 'Vai trò', value: user?.roles?.join(', '), color: '#a855f7' },
  ]

  return (
    <>
      <style>{`
        /* ===== Page wrapper ===== */
        .profile-page {
          width: 100%;
          max-width: 900px;
          margin-inline: auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
          animation: profileFadeIn .45s ease both;
        }
        @keyframes profileFadeIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ===== Hero card ===== */
        .profile-hero {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          background: rgba(30, 41, 59, 0.55);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(71, 85, 105, 0.35);
          padding: 36px 32px 28px;
        }
        .profile-hero-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 80% at 10% -10%, rgba(239,68,68,.13) 0%, transparent 60%),
                      radial-gradient(ellipse 50% 60% at 90% 110%, rgba(168,85,247,.10) 0%, transparent 60%);
          pointer-events: none;
        }
        .profile-hero-inner {
          position: relative;
          display: flex;
          align-items: center;
          gap: 28px;
          flex-wrap: wrap;
        }

        /* Avatar ring */
        .profile-avatar-ring {
          padding: 3px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444, #f97316, #a855f7);
          flex-shrink: 0;
          box-shadow: 0 0 28px rgba(239,68,68,.4);
        }
        .profile-avatar {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444, #dc2626, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          border: 3px solid #0f172a;
          letter-spacing: -.5px;
        }

        .profile-hero-info { flex: 1; min-width: 0; }
        .profile-name {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1.2;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profile-email {
          font-size: .875rem;
          color: #94a3b8;
          margin-bottom: 12px;
        }
        .profile-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: .75rem;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          border: 1px solid;
        }

        /* Stats row */
        .profile-stats {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }
        .profile-stat-card {
          flex: 1;
          min-width: 120px;
          background: rgba(15,23,42,.5);
          border: 1px solid rgba(71,85,105,.25);
          border-radius: 16px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .profile-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .profile-stat-label { font-size: .72rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
        .profile-stat-value { font-size: 1.05rem; color: #f1f5f9; font-weight: 700; margin-top: 2px; }

        /* ===== Info grid ===== */
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        @media (max-width: 640px) { .profile-grid { grid-template-columns: 1fr; } }

        .profile-card {
          background: rgba(30, 41, 59, 0.55);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .profile-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(71,85,105,.2);
          margin-bottom: 2px;
        }
        .profile-card-title-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .profile-card-title { font-size: .95rem; font-weight: 700; color: #f8fafc; }
        .profile-card-subtitle { font-size: .75rem; color: #64748b; margin-top: 1px; }

        /* Info field rows */
        .profile-info-field {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(15,23,42,.4);
          border: 1px solid rgba(71,85,105,.15);
          border-radius: 12px;
          transition: border-color .2s, background .2s;
        }
        .profile-info-field:hover {
          border-color: rgba(71,85,105,.35);
          background: rgba(15,23,42,.6);
        }
        .profile-info-field-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .profile-info-dt { font-size: .71rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
        .profile-info-dd { font-size: .88rem; color: #e2e8f0; font-weight: 600; margin-top: 2px; }

        /* ===== Password form ===== */
        .profile-field-group { display: flex; flex-direction: column; gap: 6px; }
        .profile-input-label { font-size: .8rem; font-weight: 600; color: #94a3b8; }
        .profile-input-hint { font-size: .72rem; color: #475569; margin-left: 6px; font-weight: 400; }
        .profile-input-wrap { position: relative; }
        .profile-input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #475569;
          width: 15px;
          height: 15px;
          pointer-events: none;
        }
        .profile-input {
          width: 100%;
          background: rgba(15,23,42,.6);
          border: 1px solid rgba(71,85,105,.4);
          border-radius: 12px;
          padding: 10px 42px 10px 38px;
          color: #f1f5f9;
          font-size: .88rem;
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
          box-sizing: border-box;
        }
        .profile-input::placeholder { color: #475569; }
        .profile-input:hover { border-color: rgba(71,85,105,.65); }
        .profile-input:focus {
          border-color: rgba(239,68,68,.5);
          box-shadow: 0 0 0 3px rgba(239,68,68,.12);
          background: rgba(15,23,42,.8);
        }
        .profile-input-eye {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          padding: 3px;
          display: flex;
          align-items: center;
          transition: color .15s;
        }
        .profile-input-eye:hover { color: #94a3b8; }

        /* Strength bar */
        .strength-bar-track {
          height: 4px;
          background: rgba(71,85,105,.3);
          border-radius: 4px;
          overflow: hidden;
        }
        .strength-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width .35s ease, background .35s ease;
        }
        .strength-label { font-size: .72rem; font-weight: 600; margin-top: 4px; }

        /* Match indicator */
        .match-indicator {
          font-size: .72rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        /* Submit button override */
        .profile-submit-btn {
          width: 100%;
          margin-top: 4px;
          padding: 11px;
          border-radius: 13px;
          background: linear-gradient(135deg, #ef4444, #dc2626, #b91c1c);
          color: #fff;
          font-size: .9rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all .2s;
          box-shadow: 0 0 18px rgba(239,68,68,.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .profile-submit-btn:hover:not(:disabled) {
          box-shadow: 0 0 28px rgba(239,68,68,.5);
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .profile-submit-btn:active:not(:disabled) { transform: scale(.97); }
        .profile-submit-btn:disabled { opacity: .45; cursor: not-allowed; }

        /* Success overlay animation */
        .profile-success-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: .875rem;
          font-weight: 600;
          color: #22c55e;
          padding: 8px;
          background: rgba(34,197,94,.08);
          border: 1px solid rgba(34,197,94,.2);
          border-radius: 10px;
          animation: successPop .3s ease;
        }
        @keyframes successPop {
          from { transform: scale(.9); opacity: 0; }
          to   { transform: scale(1);  opacity: 1; }
        }
      `}</style>

      <div className="profile-page">
        {/* ===== Hero ===== */}
        <div className="profile-hero">
          <div className="profile-hero-bg" />
          <div className="profile-hero-inner">
            <div className="profile-avatar-ring">
              <div className="profile-avatar">{initials}</div>
            </div>
            <div className="profile-hero-info">
              <p className="profile-name">{user?.fullName || 'Người dùng'}</p>
              <p className="profile-email">{user?.email}</p>
              <span
                className="profile-role-badge"
                style={{ color: roleColor, borderColor: `${roleColor}40`, background: `${roleColor}15` }}
              >
                <Sparkles size={11} />
                {primaryRole}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="profile-stats">
            <div className="profile-stat-card">
              <div className="profile-stat-icon" style={{ background: 'rgba(239,68,68,.12)' }}>
                <User size={18} color="#ef4444" />
              </div>
              <div>
                <div className="profile-stat-label">Tài khoản</div>
                <div className="profile-stat-value">Đang hoạt động</div>
              </div>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-icon" style={{ background: 'rgba(59,130,246,.12)' }}>
                <Shield size={18} color="#3b82f6" />
              </div>
              <div>
                <div className="profile-stat-label">Quyền hạn</div>
                <div className="profile-stat-value">{user?.roles?.length || 1} vai trò</div>
              </div>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-icon" style={{ background: 'rgba(34,197,94,.12)' }}>
                <CheckCircle2 size={18} color="#22c55e" />
              </div>
              <div>
                <div className="profile-stat-label">Trạng thái</div>
                <div className="profile-stat-value">Đã xác minh</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Grid ===== */}
        <div className="profile-grid">

          {/* Info card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-icon" style={{ background: 'rgba(239,68,68,.12)' }}>
                <User size={17} color="#ef4444" />
              </div>
              <div>
                <div className="profile-card-title">Thông tin cá nhân</div>
                <div className="profile-card-subtitle">Thông tin tài khoản của bạn</div>
              </div>
            </div>

            {infoFields.map((field) => {
              const Icon = field.icon
              return (
                <div key={field.label} className="profile-info-field">
                  <div className="profile-info-field-icon" style={{ background: `${field.color}18` }}>
                    <Icon size={15} color={field.color} />
                  </div>
                  <div>
                    <dt className="profile-info-dt">{field.label}</dt>
                    <dd className="profile-info-dd">{field.value || '—'}</dd>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Password card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-icon" style={{ background: 'rgba(239,68,68,.12)' }}>
                <KeyRound size={17} color="#ef4444" />
              </div>
              <div>
                <div className="profile-card-title">Đổi mật khẩu</div>
                <div className="profile-card-subtitle">Sử dụng mật khẩu mạnh, bảo mật hơn</div>
              </div>
            </div>

            <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {done && (
                <div className="profile-success-icon">
                  <CheckCircle2 size={16} />
                  Mật khẩu đã được cập nhật thành công!
                </div>
              )}

              <PasswordInput
                label="Mật khẩu hiện tại"
                name="oldPassword"
                autoComplete="current-password"
                value={passwords.oldPassword}
                onChange={change}
                required
                placeholder="••••••••"
              />

              <div>
                <PasswordInput
                  label="Mật khẩu mới"
                  hint="(tối thiểu 6 ký tự)"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={100}
                  value={passwords.newPassword}
                  onChange={change}
                  required
                  placeholder="••••••••"
                />
                {passwords.newPassword && (
                  <div style={{ marginTop: 8 }}>
                    <div className="strength-bar-track">
                      <div
                        className="strength-bar-fill"
                        style={{
                          width: `${(strength / 5) * 100}%`,
                          background: strengthColor[strength],
                        }}
                      />
                    </div>
                    <div className="strength-label" style={{ color: strengthColor[strength] }}>
                      {strengthLabel[strength]}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <PasswordInput
                  label="Xác nhận mật khẩu mới"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={100}
                  value={passwords.confirmPassword}
                  onChange={change}
                  required
                  placeholder="••••••••"
                />
                {passwords.confirmPassword && (
                  <div
                    className="match-indicator"
                    style={{
                      color: passwords.newPassword === passwords.confirmPassword ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {passwords.newPassword === passwords.confirmPassword ? (
                      <><CheckCircle2 size={12} /> Mật khẩu khớp</>
                    ) : (
                      <>✗ Mật khẩu chưa khớp</>
                    )}
                  </div>
                )}
              </div>

              <button type="submit" className="profile-submit-btn" disabled={submitting}>
                {submitting ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <KeyRound size={15} />
                )}
                {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </form>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
