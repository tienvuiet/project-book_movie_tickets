import { Calendar, ChevronDown, Film, Gift, LogIn, LogOut, MapPin, Menu, Search, UserRound, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import ScrollToTopButton from '../components/ScrollToTopButton'
import ChatWidget from '../components/support/ChatWidget'
import BrandLogo from '../components/BrandLogo'

export default function PublicLayout() {
  const { isAuthenticated, roles, logout, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [movieQuery, setMovieQuery] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [headerScrolled, setHeaderScrolled] = useState(() => window.scrollY > 16)
  const accountMenuRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const updateHeader = () => setHeaderScrolled(window.scrollY > 16)
    window.addEventListener('scroll', updateHeader, { passive: true })
    updateHeader()
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  const normalizedRoles = roles.map((role) => String(role).replace(/^ROLE_/i, '').toUpperCase())
  const profilePath = normalizedRoles.includes('ADMIN')
    ? '/admin/profile'
    : normalizedRoles.includes('STAFF')
      ? '/staff/profile'
      : '/profile'

  const handleMovieSearch = (event) => {
    event.preventDefault()
    const query = movieQuery.trim()
    navigate(query ? `/?q=${encodeURIComponent(query)}#now-showing` : '/#now-showing')
  }

  const closeMobile = () => setMobileOpen(false)

  /* Đóng mobile menu khi route thay đổi */
  useEffect(() => {
    closeMobile()
  }, [location.pathname, location.search])

  /* Scroll lock khi mobile menu mở */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  /* Đóng mobile menu khi nhấn Escape */
  useEffect(() => {
    if (!mobileOpen) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMobile()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  /* Đóng account menu khi click ngoài hoặc Escape */
  useEffect(() => {
    if (!accountOpen) return undefined

    const closeAccountMenu = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountOpen(false)
    }
    const closeAccountMenuOnEscape = (event) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }

    document.addEventListener('mousedown', closeAccountMenu)
    document.addEventListener('keydown', closeAccountMenuOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeAccountMenu)
      document.removeEventListener('keydown', closeAccountMenuOnEscape)
    }
  }, [accountOpen])

  const roleLabel = normalizedRoles.includes('ADMIN') ? 'ADMIN' : normalizedRoles.includes('STAFF') ? 'STAFF' : 'MEMBER'
  const displayName = user?.fullName || user?.name || user?.email || 'Tài khoản'

  const handleLogout = () => {
    setAccountOpen(false)
    logout()
  }

  /* ID duy nhất cho mobile menu panel (aria-controls) */
  const mobileMenuId = 'mobile-nav-panel'

  return (
    <div className="min-h-screen bg-dark-950 text-dark-200">
      {/* Header */}
      <header className={`site-header sticky top-0 z-[2100]${headerScrolled ? ' is-scrolled' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <BrandLogo />
            <span className="text-base font-bold tracking-tight text-white">CGV Cinemas</span>
          </Link>

          {/* Desktop nav — bắt đầu từ lg (1024px) để không chật ở tablet */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500/10 text-red-400'
                    : 'text-dark-400 hover:bg-dark-800/60 hover:text-dark-200'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Trang chủ
              </span>
            </NavLink>
            <NavLink
              to="/schedule"
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500/10 text-red-400'
                    : 'text-dark-400 hover:bg-dark-800/60 hover:text-dark-200'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Lịch chiếu
              </span>
            </NavLink>
            <NavLink
              to="/cinemas/nearby"
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500/10 text-red-400'
                    : 'text-dark-400 hover:bg-dark-800/60 hover:text-dark-200'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Tìm rạp
              </span>
            </NavLink>
            <NavLink
              to="/promotions"
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500/10 text-red-400'
                    : 'text-dark-400 hover:bg-dark-800/60 hover:text-dark-200'
                }`
              }
            >
              <span className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Khuyến mãi
              </span>
            </NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Desktop search — chỉ hiện từ lg */}
            <form
              onSubmit={handleMovieSearch}
              className="hidden items-center rounded-lg border border-dark-700/50 bg-dark-800/50 text-sm transition focus-within:border-red-500/50 focus-within:ring-2 focus-within:ring-red-500/20 lg:flex"
            >
              <Search className="ml-3 h-3.5 w-3.5 shrink-0 text-dark-400" />
              <input
                type="search"
                value={movieQuery}
                onChange={(event) => setMovieQuery(event.target.value)}
                placeholder="Tìm phim..."
                aria-label="Tìm phim"
                className="w-32 bg-transparent px-2 py-1.5 text-dark-200 placeholder:text-dark-500 outline-none"
              />
              <button
                type="submit"
                className="border-l border-dark-700/50 px-2.5 py-1.5 text-dark-400 transition hover:text-red-400"
                aria-label="Thực hiện tìm phim"
              >
                Tìm
              </button>
            </form>

            {/* Account menu — desktop lg+ */}
            {isAuthenticated ? (
              <div ref={accountMenuRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-controls="account-menu-panel"
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-dark-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-100">
                    <UserRound className="h-[18px] w-[18px]" />
                  </span>
                  <span className="max-w-32 truncate text-sm font-semibold text-white">{displayName}</span>
                  <span className="rounded-md border border-slate-300/80 bg-slate-100 px-3 py-1.5 text-xs font-extrabold tracking-wide text-slate-950">
                    {roleLabel}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-200 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {accountOpen && (
                  <div
                    id="account-menu-panel"
                    role="menu"
                    className="account-menu-panel absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 p-2 shadow-2xl shadow-black/50"
                  >
                    <Link
                      to={profilePath}
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="account-menu-item"
                    >
                      Thông tin cá nhân
                    </Link>
                    <button type="button" role="menuitem" onClick={handleLogout} className="account-menu-item">
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden lg:inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition-all hover:shadow-glow hover:brightness-110"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Link>
            )}

            {/* Mobile / tablet hamburger — hiện đến lg */}
            <button
              className="rounded-lg p-2 text-dark-400 hover:bg-dark-800 hover:text-white lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileOpen}
              aria-controls={mobileMenuId}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Mobile / Tablet Dropdown Menu ===== */}
      <>
        <style>{`
          @keyframes mobileMenuIn {
            from {
              opacity: 0;
              transform: translateY(-12px) scale(0.97);
              transform-origin: top right;
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
              transform-origin: top right;
            }
          }
          @keyframes accountMenuIn {
            from {
              opacity: 0;
              transform: translateY(-10px) scale(0.97);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .account-menu-panel {
            transform-origin: top right;
            animation: accountMenuIn 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .account-menu-item {
            display: flex;
            width: 100%;
            align-items: center;
            border: 0;
            border-radius: 10px;
            background: transparent;
            padding: 11px 10px;
            color: #e2e8f0;
            font-size: 0.95rem;
            font-weight: 500;
            text-align: left;
            text-decoration: none;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
          }
          .account-menu-item:hover,
          .account-menu-item:focus-visible {
            background: rgba(148, 163, 184, 0.12);
            color: #fff;
            outline: none;
          }
          .mobile-menu-panel {
            animation: mobileMenuIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .mobile-menu-backdrop {
            animation: fadeInBackdrop 0.18s ease both;
          }
          @keyframes fadeInBackdrop {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .mobile-nav-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 13px 16px;
            font-size: 0.97rem;
            font-weight: 500;
            color: #cbd5e1;
            border-radius: 10px;
            transition: background 0.15s, color 0.15s;
            text-decoration: none;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            min-height: 44px;
          }
          .mobile-nav-item:hover,
          .mobile-nav-item:focus-visible {
            background: rgba(239,68,68,0.08);
            color: #f87171;
            outline: none;
          }
          .mobile-nav-item.active {
            background: rgba(239,68,68,0.12);
            color: #ef4444;
            font-weight: 600;
          }
          .mobile-nav-divider {
            height: 1px;
            background: rgba(71,85,105,0.25);
            margin: 8px 0;
          }
          .mobile-menu-label {
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #475569;
            padding: 0 16px;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          @media (prefers-reduced-motion: reduce) {
            .mobile-menu-panel,
            .account-menu-panel {
              animation: none !important;
            }
          }
        `}</style>

        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="mobile-menu-backdrop fixed inset-0 z-[2000] bg-black/40 lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        {/* Panel — fixed dưới header, bên phải, hỗ trợ 100dvh */}
        {mobileOpen && (
          <div
            id={mobileMenuId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            className="mobile-menu-panel fixed z-[2010] lg:hidden"
            style={{
              top: '64px',
              right: '12px',
              width: 'min(88vw, 320px)',
              maxHeight: 'calc(100dvh - 80px)',
              overflowY: 'auto',
              background: 'rgba(10,10,20,0.97)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: '16px 8px',
              /* Safe area bottom cho iPhone */
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* MENU label */}
            <p className="mobile-menu-label">MENU</p>

            {/* Nav links */}
            <NavLink
              to="/"
              end
              onClick={closeMobile}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <Film size={18} aria-hidden="true" />
              Trang chủ
            </NavLink>

            <NavLink
              to="/schedule"
              onClick={closeMobile}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <Calendar size={18} aria-hidden="true" />
              Lịch chiếu
            </NavLink>

            <NavLink
              to="/cinemas/nearby"
              onClick={closeMobile}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <MapPin size={18} aria-hidden="true" />
              Tìm rạp gần đây
            </NavLink>

            <NavLink
              to="/promotions"
              onClick={closeMobile}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <Gift size={18} aria-hidden="true" />
              Khuyến mãi
            </NavLink>

            {/* Search — chỉ trên mobile menu */}
            <div className="mobile-nav-divider" />
            <form
              onSubmit={(e) => { handleMovieSearch(e); closeMobile() }}
              className="mx-2 my-1 flex items-center rounded-lg border border-dark-700/50 bg-dark-800/50 text-sm focus-within:border-red-500/50"
            >
              <Search className="ml-3 h-4 w-4 shrink-0 text-dark-400" aria-hidden="true" />
              <input
                type="search"
                value={movieQuery}
                onChange={(e) => setMovieQuery(e.target.value)}
                placeholder="Tìm phim..."
                aria-label="Tìm phim"
                className="flex-1 bg-transparent px-2 py-2.5 text-dark-200 placeholder:text-dark-500 outline-none text-sm"
              />
              <button
                type="submit"
                className="border-l border-dark-700/50 px-3 py-2.5 text-dark-400 hover:text-red-400 transition-colors"
                aria-label="Thực hiện tìm phim"
              >
                Tìm
              </button>
            </form>

            {/* Divider */}
            <div className="mobile-nav-divider" />

            {/* Auth section */}
            {isAuthenticated ? (
              <>
                {/* User info */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'rgba(239,68,68,0.06)',
                  borderRadius: 10,
                  marginBottom: 8,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <UserRound size={18} color="#fff" aria-hidden="true" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                      {user?.fullName || user?.name || 'Tài khoản'}
                    </p>
                    <span style={{
                      display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.08em', color: '#fbbf24',
                      background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
                      borderRadius: 999, padding: '1px 8px', marginTop: 2,
                    }}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <Link
                  to={profilePath}
                  onClick={closeMobile}
                  className="mobile-nav-item"
                >
                  <UserRound size={18} aria-hidden="true" />
                  Thông tin cá nhân
                </Link>

                <div className="mobile-nav-divider" />

                <button
                  onClick={() => { logout(); closeMobile() }}
                  className="mobile-nav-item"
                  style={{ color: '#f87171' }}
                >
                  <LogOut size={18} aria-hidden="true" />
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={closeMobile}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  margin: '4px 8px 0',
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                  minHeight: '44px',
                }}
              >
                <LogIn size={17} aria-hidden="true" />
                Đăng nhập
              </Link>
            )}
          </div>
        )}
      </>

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 bg-dark-900/50">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2.5 group">
                <BrandLogo />
                <span className="font-bold text-white">CGV Cinemas</span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-dark-500">
                Hệ thống đặt vé xem phim trực tuyến hiện đại, nhanh chóng và tiện lợi.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-white">Khám phá</h4>
              <ul className="mt-3 space-y-2 text-sm text-dark-500">
                <li><Link to="/" className="transition hover:text-dark-300">Phim đang chiếu</Link></li>
                <li><Link to="/" className="transition hover:text-dark-300">Phim sắp chiếu</Link></li>
                <li><Link to="/" className="transition hover:text-dark-300">Rạp chiếu phim</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Hỗ trợ</h4>
              <ul className="mt-3 space-y-2 text-sm text-dark-500">
                <li><Link to="/" className="transition hover:text-dark-300">Liên hệ</Link></li>
                <li><Link to="/" className="transition hover:text-dark-300">Câu hỏi thường gặp</Link></li>
                <li><Link to="/" className="transition hover:text-dark-300">Điều khoản sử dụng</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Theo dõi</h4>
              <ul className="mt-3 space-y-2 text-sm text-dark-500">
                <li><a href="#" className="transition hover:text-dark-300">Facebook</a></li>
                <li><a href="#" className="transition hover:text-dark-300">Instagram</a></li>
                <li><a href="#" className="transition hover:text-dark-300">YouTube</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-dark-800/50 pt-6 text-center text-xs text-dark-600">
            © 2026 CGV Cinemas. All rights reserved.
          </div>
        </div>
      </footer>

      <ScrollToTopButton hidden={chatOpen} />
      <ChatWidget onOpenChange={setChatOpen} />
    </div>
  )
}
