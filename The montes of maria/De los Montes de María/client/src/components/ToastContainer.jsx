import { useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { ToastProvider, useToast } from '../context/ToastContext'

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'fa-check-circle'
      case 'error':
        return 'fa-circle-xmark'
      case 'warning':
        return 'fa-triangle-exclamation'
      default:
        return 'fa-circle-info'
    }
  }

  return (
    <div className="toast-portal-wrap" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`agro-toast agro-toast-${t.type} fade-slide-in`}>
          <div className="toast-icon-wrap">
            <i className={`fa-solid ${getIcon(t.type)}`} />
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
            <i className="fa-solid fa-xmark" />
          </button>

          {t.duration > 0 && (
            <div
              className="toast-progress-bar"
              style={{ animationDuration: `${t.duration}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
