import { useDispatch, useSelector } from 'react-redux'
import { logout, selectDefaultPath, selectIsAuthenticated } from '../store/authSlice'

export function useAuth() {
  const dispatch = useDispatch()
  const auth = useSelector((state) => state.auth)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const defaultPath = useSelector(selectDefaultPath)
  return { ...auth, isAuthenticated, defaultPath, logout: () => dispatch(logout()) }
}
