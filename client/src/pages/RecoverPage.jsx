import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { requestRecover, resetPassword } from '../api/auth.api'

export default function RecoverPage() {
  const [step, setStep] = useState(1)
  const [correo, setCorreo] = useState('')
  const [token, setToken] = useState('')
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const passwordCriteria = useMemo(() => {
    const pass = nuevaContrasena || ''
    return {
      hasMinLength: pass.length >= 8,
      hasUpperCase: /[A-Z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
    }
  }, [nuevaContrasena])

  const passwordsMatch = useMemo(() => {
    if (!confirmar) return null
    return nuevaContrasena === confirmar
  }, [nuevaContrasena, confirmar])

  const handleRequestToken = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await requestRecover(correo)
      setMessage('Si el correo está registrado, recibirás un código de recuperación.')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al solicitar el restablecimiento.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (nuevaContrasena.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!passwordCriteria.hasUpperCase || !passwordCriteria.hasNumber) {
      setError('La contraseña debe incluir al menos una letra mayúscula y un número.')
      return
    }
    if (nuevaContrasena !== confirmar) {
      setError('Las contraseñas no coinciden. Verifica e inténtalo de nuevo.')
      return
    }

    setLoading(true)
    try {
      await resetPassword({
        email: correo,
        code: token.trim(),
        newPassword: nuevaContrasena,
      })
      setMessage('¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.')
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.message || 'Código/token inválido o expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-wrap">
      <div className="auth-card fade-in">
        {/* Brand Icon */}
        <div className="auth-brand">
          <div className="auth-key-icon">
            <i className="fa fa-key" />
          </div>
          <h1>Recuperar Contraseña</h1>
          <p>Te ayudaremos a restablecer el acceso a tu cuenta de forma segura</p>
        </div>

        {/* Step Indicator */}
        <div className="auth-steps">
          <span className={`auth-step ${step >= 1 ? 'done' : ''}`}>1. Correo</span>
          <span className="auth-step-sep" />
          <span className={`auth-step ${step >= 2 ? 'done' : ''}`}>2. Código</span>
          <span className="auth-step-sep" />
          <span className={`auth-step ${step >= 3 ? 'done' : ''}`}>3. Listo</span>
        </div>

        {error && (
          <div className="global-alert error fade-in">
            <i className="fa fa-exclamation-circle" /> {error}
          </div>
        )}
        {message && (
          <div className="global-alert success fade-in">
            <i className="fa fa-check-circle" /> {message}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestToken} className="auth-form">
            <div className="form-field">
              <label htmlFor="correo">Ingresa tu Correo Electrónico Registrado</label>
              <input
                id="correo"
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="form-submit-btn">
              {loading ? (
                <>
                  <i className="fa fa-spinner fa-spin" /> Enviando Código...
                </>
              ) : (
                <>
                  <i className="fa fa-paper-plane" /> Enviar Código de Recuperación
                </>
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="auth-form">
            <div className="form-field">
              <label>Código de Seguridad Recibido</label>
              <input
                type="text"
                required
                placeholder="Pega el código de 6 dígitos recibido por correo"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px', fontWeight: 700 }}
              />
            </div>

            <div className="form-field">
              <label>Nueva Contraseña *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            <div className="form-field">
              <label>
                Confirmar Nueva Contraseña *
                {passwordsMatch === true && (
                  <span style={{ float: 'right', fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                    <i className="fa fa-check" /> Coinciden
                  </span>
                )}
                {passwordsMatch === false && (
                  <span style={{ float: 'right', fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>
                    <i className="fa fa-times" /> No coinciden
                  </span>
                )}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Repite la nueva contraseña"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                  title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <i className={`fa ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Checklist */}
            {nuevaContrasena && (
              <div
                style={{
                  backgroundColor: 'rgba(22, 163, 74, 0.05)',
                  border: '1px solid rgba(22, 163, 74, 0.2)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ color: passwordCriteria.hasMinLength ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <i className={`fa ${passwordCriteria.hasMinLength ? 'fa-check-circle' : 'fa-circle'}`} /> Mínimo 8 caracteres
                </div>
                <div style={{ color: passwordCriteria.hasUpperCase ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <i className={`fa ${passwordCriteria.hasUpperCase ? 'fa-check-circle' : 'fa-circle'}`} /> Al menos una letra mayúscula
                </div>
                <div style={{ color: passwordCriteria.hasNumber ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <i className={`fa ${passwordCriteria.hasNumber ? 'fa-check-circle' : 'fa-circle'}`} /> Al menos un número
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="form-submit-btn">
              {loading ? (
                <>
                  <i className="fa fa-spinner fa-spin" /> Actualizando Contraseña...
                </>
              ) : (
                <>
                  <i className="fa fa-lock" /> Guardar Nueva Contraseña
                </>
              )}
            </button>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/login" className="form-submit-btn" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}>
              <i className="fa fa-sign-in-alt" /> Iniciar Sesión con Nueva Contraseña
            </Link>
          </div>
        )}

        <p className="auth-footer-text">
          ¿Recordaste tu contraseña? <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
