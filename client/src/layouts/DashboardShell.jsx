import { BadgePercent, Bell, ChevronDown, ChevronRight, Film, LayoutDashboard, LogOut, Menu, Tag, Ticket, User, Users, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '../hooks/useAuth'
import BrandLogo from '../components/BrandLogo'

const iconMap = { dashboard: LayoutDashboard, movies: Film, bookings: Ticket, users: Users, voucher: Tag, promotion: BadgePercent }

const ROLE_LABEL = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Thành viên',
}

export default function DashboardShell({ title, navItems }) {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { logout, roles, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  const activeItem = navItems.find((item) => location.pathname.startsWith(item.to))

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const primaryRole = String(roles?.[0] || user?.roles?.[0] || user?.role || '')
    .replace(/^ROLE_/, '')
    .toUpperCase()
  const roleLabel = ROLE_LABEL[primaryRole] || 'Người dùng'
  const profilePath = primaryRole === 'ADMIN' ? '/admin/profile' : '/staff/profile'

  return (
    <div className="min-h-screen bg-dark-950 text-dark-200 lg:grid lg:grid-cols-[272px_1fr]">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-dark-800/50 bg-dark-900/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-dark-800/50 px-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <BrandLogo />
            <span className="text-base font-bold tracking-tight text-white">CGV Cinemas</span>
          </Link>
          <button className="rounded-lg p-1.5 text-dark-400 hover:bg-dark-800 hover:text-white lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-dark-500">
            Menu
          </p>
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-red-500/15 to-red-500/5 text-white shadow-sm'
                      : 'text-dark-400 hover:bg-dark-800/60 hover:text-dark-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full gradient-brand shadow-glow-sm" />
                    )}
                    <span
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                        isActive
                          ? 'gradient-brand shadow-glow-sm text-white'
                          : 'bg-dark-800/80 text-dark-400 group-hover:bg-dark-700 group-hover:text-dark-200'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="min-w-0 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-dark-400 hover:bg-dark-800 hover:text-white lg:hidden"
              onClick={() => setOpen(!open)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <span className="text-dark-500">{title}</span>
              {activeItem && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-dark-600" />
                  <span className="font-medium text-dark-200">{activeItem.label}</span>
                </>
              )}
            </div>
            <h1 className="text-lg font-semibold text-white sm:hidden">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative rounded-lg p-2 text-dark-400 transition hover:bg-dark-800 hover:text-white">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-dark-950" />
            </button>

            {/* User dropdown */}
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-dark-800/70 focus:outline-none"
              >
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-700 text-dark-300">
                  <User className="h-4 w-4" />
                </div>
                {/* Name */}
                <span className="hidden text-sm font-semibold text-white sm:block">
                  {user?.fullName || 'Người dùng'}
                </span>
                {/* Role badge */}
                <span className="hidden rounded-md border border-dark-600 bg-dark-800 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-dark-300 sm:block">
                  {roleLabel}
                </span>
                {/* Chevron down */}
                <ChevronDown
                  className={clsx(
                    'hidden h-4 w-4 text-dark-500 transition-transform duration-200 sm:block',
                    dropdownOpen ? 'rotate-180' : 'rotate-0'
                  )}
                />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-dark-700/60 bg-dark-900 shadow-xl shadow-black/40 ring-1 ring-white/5 animate-fade-in">
                  {/* Header info */}
                  <div className="border-b border-dark-800/60 px-4 py-3">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.fullName || 'Người dùng'}
                    </p>
                    <p className="text-[11px] text-dark-400 truncate">{user?.email || ''}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                      {roleLabel}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    <button
                      onClick={() => { setDropdownOpen(false); navigate(profilePath) }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-dark-300 transition-colors hover:bg-dark-800/60 hover:text-white"
                    >
                      <User className="h-4 w-4 text-dark-400" />
                      Thông tin cá nhân
                    </button>

                    <div className="my-1 border-t border-dark-800/60" />

                    <button
                      onClick={() => { setDropdownOpen(false); logout() }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-dark-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
