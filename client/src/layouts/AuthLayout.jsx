import { ArrowLeft } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import '../styles/auth.css'
import BrandLogo from '../components/BrandLogo'

function Brand() {
  return (
    <Link to="/" className="auth-brand" aria-label="CGV Cinemas — Trang chủ">
      <BrandLogo />
      <span>CGV Cinemas</span>
    </Link>
  )
}

export default function AuthLayout() {
  const { pathname } = useLocation()
  const isAccountPage = pathname === '/login' || pathname === '/register'

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <Brand />
        <Link to="/" className="auth-home-link"><ArrowLeft size={16} aria-hidden="true" /> Về trang chủ</Link>
      </header>

      <main className="auth-main">
        <div className={`auth-form-shell${pathname === '/register' ? ' auth-registration' : ''}${isAccountPage ? '' : ' auth-recovery'}`}>
          {isAccountPage && (
            <nav className="auth-switch" aria-label="Tài khoản">
              <NavLink to="/login" className={({ isActive }) => isActive ? 'is-active' : ''}>Đăng nhập</NavLink>
              <NavLink to="/register" className={({ isActive }) => isActive ? 'is-active' : ''}>Đăng ký</NavLink>
            </nav>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
