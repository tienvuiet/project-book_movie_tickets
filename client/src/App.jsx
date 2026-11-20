import { Toaster } from 'sonner'
import ErrorBoundary from './components/ErrorBoundary'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
      <Toaster
        position="top-center"
        theme="dark"
        richColors
        closeButton
        expand
        duration={4000}
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
          },
        }}
      />
    </ErrorBoundary>
  )
}
