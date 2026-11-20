import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { roleHomePath } from '../constants/roles'
import authService from '../services/authService'
import { clearAuth, readAuth, writeAuth } from '../utils/authStorage'

const saved = readAuth()

const initialState = {
  user: saved?.user || null,
  roles: saved?.roles || [],
  accessToken: saved?.accessToken || null,
  refreshToken: saved?.refreshToken || null,
  status: 'idle',
  error: null,
}

const persist = (state) => {
  writeAuth({ user: state.user, roles: state.roles, accessToken: state.accessToken, refreshToken: state.refreshToken })
}

const normalizeAuth = (payload) => {
  const data = payload?.data || payload
  const user = data?.user || null
  return { user, roles: user?.roles || [], accessToken: data?.accessToken || null, refreshToken: data?.refreshToken || null }
}

export const login = createAsyncThunk('auth/login', async (credentials) => authService.login(credentials))
export const register = createAsyncThunk('auth/register', async (payload) => authService.register(payload))
export const getCurrentUser = createAsyncThunk('auth/me', async () => authService.getCurrentUser())
export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const refreshToken = getState().auth.refreshToken
  if (refreshToken) await authService.logout(refreshToken)
})

const clearSession = (state) => {
  state.user = null
  state.roles = []
  state.accessToken = null
  state.refreshToken = null
  state.status = 'idle'
  state.error = null
  clearAuth()
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action) { state.accessToken = action.payload.accessToken; state.refreshToken = action.payload.refreshToken || state.refreshToken; persist(state) },
    hydrateAuth(state, action) { Object.assign(state, action.payload || initialState) },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(login.fulfilled, (state, action) => { Object.assign(state, normalizeAuth(action.payload), { status: 'succeeded' }); persist(state) })
      .addCase(login.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message })
      .addCase(register.fulfilled, (state, action) => { Object.assign(state, normalizeAuth(action.payload), { status: 'succeeded' }); persist(state) })
      .addCase(getCurrentUser.fulfilled, (state, action) => { state.user = action.payload?.data || action.payload; state.roles = state.user?.roles || state.roles; persist(state) })
      .addCase(logout.fulfilled, clearSession)
      .addCase(logout.rejected, clearSession)
  },
})

export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken)
export const selectDefaultPath = (state) => roleHomePath[state.auth.roles?.[0]] || '/'
export const { hydrateAuth, setTokens } = authSlice.actions
export default authSlice.reducer
