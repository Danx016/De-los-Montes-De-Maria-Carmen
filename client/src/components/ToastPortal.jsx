import { useContext } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext } from '../context/ToastContext'

function getIcon(type) {
  switch (type) {
    case 'success': return 'fa fa-check-circle'
    case 'error':   return 'fa fa-times-circle'
    case 'warning': return 'fa fa-exclamation-triangle'
    default:        return 'fa fa-info-circle'
  }
}

export default function ToastPortal() {
  const ctx = useContext(ToastContext)
  if (!ctx || ctx.toasts.length === 0) return null

  const { toasts, removeToast } = ctx

  return createPortal(
    <div className="toast-portal-wrap" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`agro-toast agro-toast-${t.type} fade-slide-in`}>
          <div className="toast-icon-wrap">
            <i className={getIcon(t.type)} aria-hidden="true" />
          </div>

          <div className="toast-content-wrap">
            {t.title && <strong className="toast-title">{t.title}</strong>}
            <div className="toast-message">{t.message}</div>
          </div>

          <button
            type="button"
            className="toast-close-btn"
            onClick={() => removeToast(t.id)}
            aria-label="Cerrar notificación"
          >
            <i className="fa fa-times" aria-hidden="true" />
          </button>

          {t.duration > 0 && (
            <div
              className="toast-progress-bar"
              style={{ animationDuration: `${t.duration}ms` }}
            />
          )}
        </div>
      ))}
    </div>,
    document.body
  )
}
