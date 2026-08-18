import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { register, checkUsername, loginGoogle as loginGoogleApi } from '../api/auth.api'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    nombre: '',
    apodo: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    telefono: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === 'apodo' && value.trim().length >= 3) {
      checkUsernameAvailability(value.trim())
    }
  }

  const checkUsernameAvailability = async (username) => {
    setUsernameStatus({ checking: true, available: null })
    try {
      const res = await checkUsername(username)
      setUsernameStatus({ checking: false, available: res.data?.disponible ?? true })
    } catch {
      setUsernameStatus({ checking: false, available: null })
    }
  }

  // ── Password Security Calculations ──
  const passwordCriteria = useMemo(() => {
    const pass = formData.contrasena || ''
    return {
      hasMinLength: pass.length >= 8,
      hasUpperCase: /[A-Z]/.test(pass),
      hasLowerCase: /[a-z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecial: /[^A-Za-z0-9]/.test(pass),
    }
  }, [formData.contrasena])

  const passwordStrength = useMemo(() => {
    const pass = formData.contrasena || ''
    if (!pass) return { score: 0, text: '', color: '#e2e8f0', percent: 0 }

    let score = 0
    if (passwordCriteria.hasMinLength) score += 1
    if (passwordCriteria.hasUpperCase) score += 1
    if (passwordCriteria.hasNumber) score += 1
    if (passwordCriteria.hasSpecial || passwordCriteria.hasLowerCase) score += 1

    switch (score) {
      case 1:
        return { score: 1, text: 'Débil', color: '#ef4444', percent: 25 }
      case 2:
        return { score: 2, text: 'Regular', color: '#f59e0b', percent: 50 }
      case 3:
        return { score: 3, text: 'Buena', color: '#10b981', percent: 75 }
      case 4:
        return { score: 4, text: 'Muy Segura', color: '#16a34a', percent: 100 }
      default:
        return { score: 0, text: 'Muy Corta', color: '#ef4444', percent: 15 }
    }
  }, [formData.contrasena, passwordCriteria])

  const passwordsMatch = useMemo(() => {
    if (!formData.confirmarContrasena) return null
    return formData.contrasena === formData.confirmarContrasena
  }, [formData.contrasena, formData.confirmarContrasena])

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const res = await loginGoogleApi(credentialResponse.credential)
      const token = res.data?.token
      const userData = res.data?.usuario || res.data?.user || res.data
      if (token) {
        login(token, userData)
        setSuccess('¡Registro y acceso exitoso con Google!')
        setTimeout(() => navigate('/'), 800)
      } else {
        setError('Respuesta inválida al registrar con Google.')
      }
    } catch (err) {
      console.error('Error Google Auth:', err)
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Error al registrarse con Google.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.nombre.trim()) {
      setError('Por favor ingresa tu nombre completo.')
      return
    }
    if (!formData.apodo.trim()) {
      setError('Por favor ingresa un nombre de usuario.')
      return
    }
    if (!formData.correo.trim()) {
      setError('Por favor ingresa tu correo electrónico.')
      return
    }

    // Validaciones de contraseña
    if (!formData.contrasena) {
      setError('Por favor ingresa una contraseña segura.')
      return
    }
    if (formData.contrasena.length < 8) {
      setError('Por seguridad, la contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!passwordCriteria.hasUpperCase) {
      setError('La contraseña debe incluir al menos una letra mayúscula.')
      return
    }
    if (!passwordCriteria.hasNumber) {
      setError('La contraseña debe incluir al menos un número.')
      return
    }
    if (formData.contrasena !== formData.confirmarContrasena) {
      setError('Las contraseñas no coinciden. Verifica e inténtalo nuevamente.')
      return
    }

    setLoading(true)
    try {
      const res = await register({
        nombre: formData.nombre.trim(),
        apodo: formData.apodo.trim(),
        correo: formData.correo.trim(),
        password: formData.contrasena,
        confirmPassword: formData.confirmarContrasena,
        telefono: formData.telefono.trim(),
        id_rol: 3, // Rol cliente/comprador
      })
      if (res.data?.token) {
        login(res.data.token, res.data.usuario || res.data.user)
        setSuccess('¡Registro exitoso! Redirigiendo...')
        setTimeout(() => navigate('/'), 1000)
      } else {
        setSuccess('Cuenta creada exitosamente. Inicia sesión para continuar.')
        setTimeout(() => navigate('/login'), 1500)
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Error al registrar la cuenta.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-wrap">
      <div className="auth-card auth-card-wide fade-in">
        {/* Brand */}
        <div className="auth-brand">
          <img
            src="/img/Logo.jpg"
            alt="Logo"
            className="auth-brand-img"
            onError={(e) => {
              e.target.src = '/img/Logo.jpg'
            }}
          />
          <h1>Crear Cuenta Nueva</h1>
          <p>Únete a la red campesina y comercial de Los Montes de María</p>
        </div>

        {error && (
          <div className="global-alert error fade-in">
            <i className="fa fa-exclamation-circle" /> {error}
          </div>
        )}
        {success && (
          <div className="global-alert success fade-in">
            <i className="fa fa-check-circle" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-form-row">
            <div className="form-field">
              <label htmlFor="nombre">Nombre Completo *</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej: Danilo Gómez"
                value={formData.nombre}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label htmlFor="apodo">
                Nombre de Usuario *
                {usernameStatus.checking && (
                  <span className="username-checking">
                    {' '}
                    <i className="fa fa-spinner fa-spin" />
                  </span>
                )}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <span className="username-ok">
                    {' '}
                    <i className="fa fa-check" /> Disponible
                  </span>
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <span className="username-taken">
                    {' '}
                    <i className="fa fa-times" /> No disponible
                  </span>
                )}
              </label>
              <input
                id="apodo"
                name="apodo"
                type="text"
                placeholder="Ej: danilo_montes"
                value={formData.apodo}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="form-field">
              <label htmlFor="correo">Correo Electrónico *</label>
              <input
                id="correo"
                name="correo"
                type="email"
                placeholder="ejemplo@correo.com"
                value={formData.correo}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label htmlFor="telefono">Teléfono / WhatsApp (Opcional)</label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                placeholder="Ej: 300 123 4567"
                value={formData.telefono}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* ── Contraseña y Confirmar Contraseña ── */}
          <div className="auth-form-row">
            {/* Contraseña Principal */}
            <div className="form-field">
              <label htmlFor="contrasena">
                Contraseña *
                {formData.contrasena && (
                  <span
                    style={{
                      float: 'right',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: passwordStrength.color,
                    }}
                  >
                    Seguridad: {passwordStrength.text}
                  </span>
                )}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="contrasena"
                  name="contrasena"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.contrasena}
                  onChange={handleChange}
                  style={{ width: '100%', paddingRight: '42px' }}
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
                    color: 'var(--text-muted, #64748b)',
                    fontSize: '1rem',
                    padding: '4px',
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>

              {/* Barra de Fuerza */}
              {formData.contrasena && (
                <div
                  style={{
                    width: '100%',
                    height: '5px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    marginTop: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${passwordStrength.percent}%`,
                      height: '100%',
                      backgroundColor: passwordStrength.color,
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="form-field">
              <label htmlFor="confirmarContrasena">
                Confirmar Contraseña *
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
                  id="confirmarContrasena"
                  name="confirmarContrasena"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  value={formData.confirmarContrasena}
                  onChange={handleChange}
                  style={{ width: '100%', paddingRight: '42px' }}
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
                    color: 'var(--text-muted, #64748b)',
                    fontSize: '1rem',
                    padding: '4px',
                  }}
                  title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <i className={`fa ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Checklist de Requisitos de Seguridad */}
          {formData.contrasena && (
            <div
              className="fade-in"
              style={{
                backgroundColor: 'rgba(22, 163, 74, 0.05)',
                border: '1px solid rgba(22, 163, 74, 0.2)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.5rem',
                fontSize: '0.82rem',
              }}
            >
              <div
                style={{
                  color: passwordCriteria.hasMinLength ? '#16a34a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                }}
              >
                <i className={`fa ${passwordCriteria.hasMinLength ? 'fa-check-circle' : 'fa-circle'}`} /> Mínimo 8 caracteres
              </div>
              <div
                style={{
                  color: passwordCriteria.hasUpperCase ? '#16a34a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                }}
              >
                <i className={`fa ${passwordCriteria.hasUpperCase ? 'fa-check-circle' : 'fa-circle'}`} /> Una letra mayúscula
              </div>
              <div
                style={{
                  color: passwordCriteria.hasNumber ? '#16a34a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                }}
              >
                <i className={`fa ${passwordCriteria.hasNumber ? 'fa-check-circle' : 'fa-circle'}`} /> Al menos un número
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="form-submit-btn" style={{ marginTop: '0.5rem' }}>
            {loading ? (
              <>
                <i className="fa fa-spinner fa-spin" /> Creando cuenta segura...
              </>
            ) : (
              <>
                <i className="fa fa-user-plus" /> Crear Mi Cuenta
              </>
            )}
          </button>
        </form>

        {/* Google Signup */}
        <div className="auth-divider">
          <span>o continúa con</span>
        </div>
        <div className="google-auth-btn-wrap">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('No se pudo conectar con Google. Por favor intenta de nuevo.')}
            useOneTap={false}
            shape="pill"
            text="signup_with"
            size="large"
            theme="outline"
          />
        </div>

        <p className="auth-footer-text">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  )
}
