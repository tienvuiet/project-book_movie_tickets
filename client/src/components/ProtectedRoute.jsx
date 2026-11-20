import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation()
  const { isAuthenticated, roles } = useAuth()
  const normalizeRole = (role) => String(role || '').replace(/^ROLE_/i, '').toUpperCase()
  const normalizedRoles = roles.map(normalizeRole)
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole)

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (normalizedAllowedRoles.length && !normalizedRoles.some((role) => normalizedAllowedRoles.includes(role))) {
    return <Navigate to="/403" replace />
  }
  return <Outlet />
}
