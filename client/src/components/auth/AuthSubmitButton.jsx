import { ArrowRight, LoaderCircle } from 'lucide-react'

export default function AuthSubmitButton({ loading, children, pendingText }) {
  return (
    <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
      <span>{loading ? pendingText : children}</span>
      {loading ? <LoaderCircle size={18} className="auth-spinner" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
    </button>
  )
}
