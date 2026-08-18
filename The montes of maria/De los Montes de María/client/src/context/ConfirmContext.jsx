import { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const ConfirmContext = createContext(null)

/**
 * Hook — usage:
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title: '...', message: '...', danger: true, confirmText: '...', cancelText: '...' })
 *   if (!ok) return
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null) // { title, message, danger, confirmText, cancelText, resolve }

  const confirm = useCallback(
    ({
      title = '¿Confirmar acción?',
      message = '',
      danger = false,
      confirmText,
      cancelText = 'Cancelar',
    } = {}) => {
      return new Promise((resolve) => {
        setDialog({
          title,
          message,
          danger,
          confirmText: confirmText || (danger ? 'Sí, eliminar' : 'Confirmar'),
          cancelText,
          resolve,
        })
      })
    }
  )

  const handleClose = (result) => {
    if (dialog) dialog.resolve(result)
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog &&
        createPortal(
          <div className="modal-overlay" onClick={() => handleClose(false)}>
            <div
              className="modal-content card"
              style={{
                maxWidth: '460px',
                width: '100%',
                padding: '1.75rem',
                borderRadius: '14px',
                animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="modal-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem' }}>
                <h3
                  id="confirm-title"
                  style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: dialog.danger ? '#dc2626' : 'var(--text-main)',
                  }}
                >
                  <i
                    className={`fa ${
                      dialog.danger
                        ? 'fa-exclamation-triangle text-danger'
                        : 'fa-question-circle text-primary'
                    }`}
                  />
                  {dialog.title}
                </h3>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="modal-close"
                  aria-label="Cerrar modal"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}
                >
                  <i className="fa fa-times" />
                </button>
              </div>

              {/* Body */}
              <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{dialog.message}</p>

                {dialog.danger && (
                  <div
                    className="alert alert-danger"
                    style={{
                      marginTop: '1rem',
                      marginBottom: 0,
                      padding: '0.65rem 0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      borderRadius: '8px',
                    }}
                  >
                    <i className="fa fa-info-circle" />
                    <span>Esta acción no se puede deshacer.</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleClose(false)}
                  style={{ minWidth: '100px', fontWeight: 600 }}
                >
                  {dialog.cancelText}
                </button>
                <button
                  type="button"
                  className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => handleClose(true)}
                  style={{ minWidth: '120px', fontWeight: 700 }}
                  autoFocus
                >
                  {dialog.danger && <i className="fa fa-trash-alt" />} {dialog.confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  )
}
