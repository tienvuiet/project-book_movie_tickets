import { useEffect } from 'react'
import { toast } from 'sonner'

export default function Notification({ type = 'success', message }) {
  useEffect(() => {
    if (!message) return
    const id = `notification:${type}:${message}`
    if (type === 'error') toast.error(message, { id })
    else if (type === 'warning') toast.warning(message, { id })
    else if (type === 'info') toast.info(message, { id })
    else toast.success(message, { id })
  }, [message, type])

  return null
}
