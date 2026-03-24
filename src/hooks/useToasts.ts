import { useState } from 'react'

export interface Toast {
  id: number
  message: string
  undoAction?: () => void
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, undoAction?: () => void) => {
    const id = Date.now()
    setToasts(prev => [{ id, message, undoAction }, ...prev].slice(0, 5))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  const dismissToast = (id: number) =>
    setToasts(prev => prev.filter(t => t.id !== id))

  return { toasts, addToast, dismissToast }
}
