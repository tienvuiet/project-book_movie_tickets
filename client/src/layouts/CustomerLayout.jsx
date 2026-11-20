import DashboardShell from './DashboardShell'
import ChatWidget from '../components/support/ChatWidget'

export default function CustomerLayout() {
  return (
    <>
      <DashboardShell title="Tài khoản" navItems={[{ to: '/profile', label: 'Hồ sơ', icon: 'users' }, { to: '/my-bookings', label: 'Vé của tôi', icon: 'bookings' }]} />
      <ChatWidget />
    </>
  )
}
