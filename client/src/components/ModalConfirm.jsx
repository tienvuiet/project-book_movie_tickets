import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function ModalConfirm({ open, title = 'Xác nhận thao tác', message, onCancel, onConfirm, confirmLabel = 'Xác nhận' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl glass-strong shadow-glass-lg p-6 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-dark-400">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onCancel}>Hủy</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
