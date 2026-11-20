import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.jsx'
import { store } from './store'
import { hydrateAuth } from './store/authSlice'
import './styles/index.css'

window.addEventListener('cinema-auth-updated', (event) => store.dispatch(hydrateAuth(event.detail)))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
