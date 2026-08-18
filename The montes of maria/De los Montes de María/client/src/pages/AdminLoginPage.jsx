import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { login as loginApi } from '../api/auth.api'

export default function AdminLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await loginApi(correo, contrasena)
      const token = res.data?.token
      const userData = res.data?.usuario || res.data?.user || res.data

      if (token && (userData?.rol === 1 || userData?.id_rol === 1)) {
        login(token, userData)
        navigate('/admin')
      } else {
        setError('Acceso denegado: Esta cuenta no posee permisos de Administrador.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error en las credenciales de administrador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />

      <main className="main-content auth-page-container">
        <div className="auth-card card admin-auth-card fade-in">
          <div className="auth-header">
            <div className="auth-icon-wrap admin-badge-icon">
              <i className="fa fa-shield-alt" />
            </div>
            <h2>Acceso Administrativo</h2>
            <p>Panel de Control y Gestión Central</p>
          </div>

          {error && (
            <div className="alert alert-danger fade-in">
              <i className="fa fa-shield-virus" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="correo">Correo de Administrador</label>
              <input
                id="correo"
                type="email"
                required
                placeholder="admin@montesdemaria.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contrasena">Contraseña de Seguridad</label>
              <input
                id="contrasena"
                type="password"
                required
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="form-input"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
              {loading ? <i className="fa fa-spinner fa-spin" /> : 'Ingresar al Panel'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </>
  )
}
