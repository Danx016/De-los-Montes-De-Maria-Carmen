import { createContext, useContext, useState, useCallback } from 'react'

export const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type, message, title = '', duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const newToast = { id, type, message, title, duration }

    setToasts((prev) => [...prev.slice(-4), newToast]) // keep at most 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [removeToast])

  const toast = {
    success: (msg, title = '') => addToast('success', msg, title),
    error: (msg, title = '') => addToast('error', msg, title),
    warning: (msg, title = '') => addToast('warning', msg, title),
    info: (msg, title = '') => addToast('info', msg, title),
    remove: removeToast,
  }

  // Global window fallback so any non-React code or utility can show toasts
  if (typeof window !== 'undefined') {
    window.agroToast = toast
  }

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      success: (msg) => console.log('Toast success:', msg),
      error: (msg) => console.error('Toast error:', msg),
      warning: (msg) => console.warn('Toast warning:', msg),
      info: (msg) => console.info('Toast info:', msg),
      remove: () => {},
    }
  }
  return ctx.toast
}
