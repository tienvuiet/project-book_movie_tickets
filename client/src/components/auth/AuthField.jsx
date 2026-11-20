import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export default function AuthField({ id, label, type = 'text', error, hint, registration, ...props }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={`auth-field${error ? ' auth-field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <input
          {...props}
          {...registration}
          id={id}
          type={isPassword && visible ? 'text' : type}
          className={isPassword ? 'auth-input auth-input-password' : 'auth-input'}
          aria-invalid={Boolean(error)}
          aria-describedby={description}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-controls={id}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="auth-field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="auth-field-error" role="alert">{error}</p>}
    </div>
  )
}
