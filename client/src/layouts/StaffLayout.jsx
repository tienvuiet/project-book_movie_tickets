import DashboardShell from './DashboardShell'

export default function StaffLayout() {
  return (
    <DashboardShell
      title="Nhân viên"
      navItems={[
        { to: '/staff/dashboard', label: 'Tổng quan', icon: 'dashboard' },
        { to: '/staff/checkin', label: 'Kiểm vé', icon: 'bookings' },
        { to: '/staff/bookings', label: 'Tra cứu vé', icon: 'movies' },
        { to: '/staff/schedule', label: 'Lịch chiếu', icon: 'movies' },
        { to: '/staff/cinemas', label: 'Rạp, phòng, ghế', icon: 'movies' },
        { to: '/staff/showtimes', label: 'Quản lý suất chiếu', icon: 'bookings' },
        { to: '/staff/support', label: 'Hỗ trợ trực tuyến', icon: 'dashboard' },
        { to: '/staff/profile', label: 'Hồ sơ cá nhân', icon: 'users' },
      ]}
    />
  )
}
