import { Loader2 } from 'lucide-react'

export default function Loading({ label = 'Đang tải...' }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-dark-400">
      <Loader2 className="h-5 w-5 animate-spin text-red-400" />
      <span>{label}</span>
    </div>
  )
}
