import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { login as loginApi, loginGoogle as loginGoogleApi } from '../api/auth.api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuthSuccess = (token, userData) => {
    login(token, userData)
    const roleId = Number(userData?.rol ?? userData?.id_rol)
    if (roleId === 1) {
      navigate('/admin')
    } else if (roleId === 2) {
      navigate('/vendedor')
    } else {
      navigate('/')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginApi(correo, contrasena)
      const token = res.data?.token
      const userData = res.data?.usuario || res.data?.user || res.data
      if (token) {
        handleAuthSuccess(token, userData)
      } else {
        setError('Respuesta del servidor inválida.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Credenciales incorrectas o error en el servidor.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const res = await loginGoogleApi(credentialResponse.credential)
      const token = res.data?.token
      const userData = res.data?.usuario || res.data?.user || res.data
      if (token) {
        handleAuthSuccess(token, userData)
      } else {
        setError('Respuesta del servidor inválida con Google.')
      }
    } catch (err) {
      console.error('Error Google Auth:', err)
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error al iniciar sesión con Google.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-wrap">
      <div className="auth-card fade-in">
        {/* Brand */}
        <div className="auth-brand">
          <img
            src="/img/Logo.jpg"
            alt="Logo"
            className="auth-brand-img"
            onError={(e) => { e.target.src = '/img/logo vaca.png' }}
          />
          <h1>Bienvenido de Vuelta</h1>
          <p>Ingresa a tu cuenta de De los Montes de María</p>
        </div>

        {error && (
          <div className="global-alert error fade-in">
            <i className="fa fa-exclamation-circle" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              id="correo"
              type="email"
              required
              placeholder="ejemplo@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>

          <div className="form-field">
            <div className="auth-label-row">
              <label htmlFor="contrasena">Contraseña</label>
              <Link to="/recuperar" className="auth-forgot-link">¿Olvidaste tu contraseña?</Link>
            </div>
            <div className="auth-password-wrap">
              <input
                id="contrasena"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="form-submit-btn">
            {loading
              ? <><i className="fa fa-spinner fa-spin" /> Iniciando...</>
              : <><i className="fa fa-sign-in-alt" /> Iniciar Sesión</>
            }
          </button>
        </form>

        {/* Google Login */}
        <div className="auth-divider">
          <span>o continúa con</span>
        </div>
        <div className="google-auth-btn-wrap">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('No se pudo conectar con Google. Por favor intenta de nuevo.')}
            useOneTap={false}
            shape="pill"
            text="continue_with"
            size="large"
            theme="outline"
          />
        </div>

        <p className="auth-footer-text">
          ¿Aún no tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  )
}

