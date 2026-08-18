import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { listarDirecciones, agregarDireccion } from '../api/usuario.api'
import { COLOMBIAN_DEPARTMENTS, getMunicipiosPorDepartamento } from '../data/colombiaData'

export default function CheckoutPage() {
  const { items, total } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [direcciones, setDirecciones] = useState([])
  const [selectedDir, setSelectedDir] = useState(null)
  const [showNewDir, setShowNewDir] = useState(false)
  const [newDir, setNewDir] = useState({
    departamento: user?.departamento || 'Bolívar',
    municipio: user?.municipio || 'El Carmen de Bolívar',
    direccion: user?.direccion || '',
    barrio: '',
    indicaciones: '',
  })
  const [loading, setLoading] = useState(true)
  const [savingDir, setSavingDir] = useState(false)
  const [error, setError] = useState('')

  const userId = user?.id || user?.id_usuario

  useEffect(() => {
    if (items.length === 0) {
      navigate('/carrito')
      return
    }

    if (userId) {
      listarDirecciones(userId)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.direcciones || [])
          
          if (list.length > 0) {
            setDirecciones(list)
            setSelectedDir(list[0].id_direccion || list[0].id)
            setShowNewDir(false)
          } else if (user?.direccion && user.direccion.trim() !== '') {
            // Usar la dirección guardada en el perfil del usuario
            const profileAddr = {
              id_direccion: 'perfil_usuario',
              id: 'perfil_usuario',
              titulo: 'Mi Dirección Registrada',
              direccion_principal: user.direccion,
              direccion: user.direccion,
              departamento: user.departamento || 'Bolívar',
              ciudad: user.municipio || 'El Carmen de Bolívar',
              municipio: user.municipio || 'El Carmen de Bolívar',
              telefono: user.telefono || '',
              notas: '',
            }
            setDirecciones([profileAddr])
            setSelectedDir('perfil_usuario')
            setShowNewDir(false)
          } else {
            setShowNewDir(true)
          }
        })
        .catch(() => {
          if (user?.direccion && user.direccion.trim() !== '') {
            const profileAddr = {
              id_direccion: 'perfil_usuario',
              id: 'perfil_usuario',
              titulo: 'Mi Dirección Registrada',
              direccion_principal: user.direccion,
              direccion: user.direccion,
              departamento: user.departamento || 'Bolívar',
              ciudad: user.municipio || 'El Carmen de Bolívar',
              municipio: user.municipio || 'El Carmen de Bolívar',
              telefono: user.telefono || '',
              notas: '',
            }
            setDirecciones([profileAddr])
            setSelectedDir('perfil_usuario')
            setShowNewDir(false)
          } else {
            setShowNewDir(true)
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
      setShowNewDir(true)
    }
  }, [userId, user, items, navigate])

  const handleAddAddress = async (e) => {
    if (e) e.preventDefault()
    if (!newDir.municipio || !newDir.direccion) {
      setError('Por favor completa el departamento, municipio y dirección de entrega.')
      return false
    }

    setSavingDir(true)
    setError('')
    try {
      const payload = {
        titulo: 'Dirección de Entrega',
        direccion_principal: newDir.direccion,
        departamento: newDir.departamento,
        ciudad: newDir.municipio,
        telefono: user?.telefono || '',
        codigo_postal: '',
        notas: newDir.indicaciones || (newDir.barrio ? `Barrio: ${newDir.barrio}` : ''),
        direccion: newDir.direccion,
        municipio: newDir.municipio,
        barrio: newDir.barrio || '',
        indicaciones: newDir.indicaciones || '',
      }

      if (userId) {
        const res = await agregarDireccion(userId, payload)
        const created = res.data?.direccion || { ...payload, id_direccion: res.data?.id_direccion || Date.now() }
        const newId = created.id_direccion || created.id
        setDirecciones((prev) => [...prev, created])
        setSelectedDir(newId)
      } else {
        const localAddr = { ...payload, id_direccion: Date.now() }
        setDirecciones((prev) => [...prev, localAddr])
        setSelectedDir(localAddr.id_direccion)
      }

      setShowNewDir(false)
      return true
    } catch (err) {
      setError('No se pudo guardar la dirección. Intenta de nuevo.')
      return false
    } finally {
      setSavingDir(false)
    }
  }

  const handleProceedToPayment = async () => {
    setError('')

    // Si el usuario está llenando una dirección nueva y hace clic en continuar
    if (showNewDir) {
      const ok = await handleAddAddress()
      if (!ok) return
    }

    const currentAddress = direcciones.find((d) => (d.id_direccion || d.id) === selectedDir) || newDir

    if (!currentAddress || (!currentAddress.direccion_principal && !currentAddress.direccion)) {
      setError('Por favor selecciona o ingresa una dirección de entrega válida.')
      return
    }

    // Guardar selección de envío en sessionStorage
    sessionStorage.setItem(
      'checkout_shipping',
      JSON.stringify({
        id_direccion: selectedDir,
        direccion: currentAddress,
      })
    )
    navigate('/pago')
  }

  const formatCOP = (val) =>
    Number(val || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="app-container">
          <div className="checkout-stepper">
            <span className="step-badge completed">1. Carrito</span>
            <span className="step-arrow">→</span>
            <span className="step-badge active">2. Envío</span>
            <span className="step-arrow">→</span>
            <span className="step-badge">3. Pago</span>
          </div>

          <div className="cart-layout-grid fade-in" style={{ marginTop: '2rem' }}>
            {/* Address Selection */}
            <div className="cart-items-column">
              <div className="card">
                <h2><i className="fa fa-map-marker-alt" /> Dirección de Entrega</h2>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                  ¿Dónde deseas recibir tus productos del campo?
                </p>

                {error && (
                  <div className="alert alert-danger fade-in">
                    <i className="fa fa-exclamation-circle" /> {error}
                  </div>
                )}

                {loading ? (
                  <div className="loading-screen"><div className="spinner" /></div>
                ) : (
                  <>
                    {direcciones.length > 0 && !showNewDir && (
                      <div className="address-options-list">
                        {direcciones.map((dir) => {
                          const dirId = dir.id_direccion || dir.id
                          return (
                            <label
                              key={dirId}
                              className={`address-card ${selectedDir === dirId ? 'active' : ''}`}
                            >
                              <input
                                type="radio"
                                name="selected_address"
                                checked={selectedDir === dirId}
                                onChange={() => setSelectedDir(dirId)}
                              />
                              <div className="address-details">
                                <strong>{dir.titulo ? `${dir.titulo} (${dir.ciudad || dir.municipio}, ${dir.departamento})` : `${dir.ciudad || dir.municipio}, ${dir.departamento}`}</strong>
                                <span>{dir.direccion_principal || dir.direccion} {dir.barrio ? `(Barrio: ${dir.barrio})` : ''}</span>
                                {(dir.notas || dir.indicaciones) && <small>Nota: {dir.notas || dir.indicaciones}</small>}
                              </div>
                            </label>
                          )
                        })}

                        <button
                          type="button"
                          onClick={() => setShowNewDir(true)}
                          className="btn btn-secondary btn-block"
                          style={{ marginTop: '1rem' }}
                        >
                          <i className="fa fa-plus" /> Añadir Otra Dirección
                        </button>
                      </div>
                    )}

                    {showNewDir && (
                      <form onSubmit={handleAddAddress} className="new-address-form fade-in">
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Departamento *</label>
                            <select
                              value={newDir.departamento}
                              onChange={(e) => {
                                const dept = e.target.value
                                const munis = getMunicipiosPorDepartamento(dept)
                                setNewDir({ ...newDir, departamento: dept, municipio: munis[0] || '' })
                              }}
                              className="form-select"
                              required
                            >
                              {COLOMBIAN_DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Municipio / Ciudad *</label>
                            <select
                              required
                              value={newDir.municipio}
                              onChange={(e) => setNewDir({ ...newDir, municipio: e.target.value })}
                              className="form-select"
                            >
                              <option value="">-- Selecciona Municipio --</option>
                              {getMunicipiosPorDepartamento(newDir.departamento).map((muni) => (
                                <option key={muni} value={muni}>
                                  {muni}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Dirección / Finca</label>
                            <input
                              type="text"
                              required
                              placeholder="Calle, Carrera, Vereda o Finca"
                              value={newDir.direccion}
                              onChange={(e) => setNewDir({ ...newDir, direccion: e.target.value })}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Barrio / Sector</label>
                            <input
                              type="text"
                              placeholder="Ej: Centro, La Floresta"
                              value={newDir.barrio}
                              onChange={(e) => setNewDir({ ...newDir, barrio: e.target.value })}
                              className="form-input"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Indicaciones para el Transportador</label>
                          <textarea
                            placeholder="Ej: Casa esquinera con rejas verdes, frente a la escuela."
                            value={newDir.indicaciones}
                            onChange={(e) => setNewDir({ ...newDir, indicaciones: e.target.value })}
                            className="form-textarea"
                            rows={2}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button type="submit" disabled={savingDir} className="btn btn-primary">
                            {savingDir ? <i className="fa fa-spinner fa-spin" /> : 'Guardar y Usar'}
                          </button>
                          {direcciones.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowNewDir(false)}
                              className="btn btn-secondary"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="cart-summary-column">
              <div className="card cart-summary-card">
                <h3>Resumen</h3>
                <hr />
                <div className="summary-row">
                  <span>Productos ({items.length})</span>
                  <strong>{formatCOP(total)}</strong>
                </div>
                <div className="summary-row">
                  <span>Envío Montes de María</span>
                  <strong>$15.000</strong>
                </div>
                <hr />
                <div className="summary-row total-row">
                  <span>Total Final</span>
                  <span className="total-price">{formatCOP(total + 15000)}</span>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={savingDir}
                  className="btn btn-primary btn-block btn-lg"
                  style={{ marginTop: '1.5rem' }}
                >
                  {savingDir ? <i className="fa fa-spinner fa-spin" /> : <>Continuar al Método de Pago <i className="fa fa-arrow-right" /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
