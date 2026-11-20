import DashboardShell from './DashboardShell'

export default function AdminLayout() {
  return (
    <DashboardShell
      title="Quản trị"
      navItems={[
        { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { to: '/admin/users', label: 'Người dùng', icon: 'users' },
        { to: '/admin/staffs', label: 'Nhân viên', icon: 'users' },
        { to: '/admin/bookings', label: 'Quản lý vé', icon: 'bookings' },
        { to: '/admin/cinemas', label: 'Rạp chiếu', icon: 'movies' },
        { to: '/admin/movies', label: 'Phim', icon: 'movies' },
        { to: '/admin/genres', label: 'Thể loại', icon: 'movies' },
        { to: '/admin/showtimes', label: 'Suất chiếu', icon: 'bookings' },
        { to: '/admin/promotions', label: 'Khuyến mãi', icon: 'promotion' },
      ]}
    />
  )
}

