import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import {
  actualizarPerfil,
  eliminarDireccion,
  listarDirecciones,
  agregarDireccion,
  actualizarDireccion,
  subirAvatar,
  subirPortada,
} from '../api/usuario.api'
import { historialUsuario } from '../api/compras.api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import InvoiceModal from '../components/InvoiceModal'
import { COLOMBIAN_DEPARTMENTS, getMunicipiosPorDepartamento } from '../data/colombiaData'

export default function ProfilePage() {
  const toast = useToast()
  const confirm = useConfirm()
  const { user, login, refreshUser } = useAuth()
  const navigate = useNavigate()
  const userId = user?.id || user?.id_usuario
  const [invoiceId, setInvoiceId] = useState(null)

  const [activeTab, setActiveTab] = useState('perfil') // 'perfil' | 'pedidos' | 'direcciones'
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    direccion: '',
    descripcion: '',
    categoria_productos: '',
  })
  const [direcciones, setDirecciones] = useState([])
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [localAvatarPreview, setLocalAvatarPreview] = useState(null)
  const [localCoverPreview, setLocalCoverPreview] = useState(null)
  const [imgKey, setImgKey] = useState(Date.now())
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [inlineBio, setInlineBio] = useState('')
  const [savingBio, setSavingBio] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const EMPTY_DIR = {
    titulo: '',
    direccion_principal: '',
    departamento: 'Bolívar',
    ciudad: 'El Carmen de Bolívar',
    telefono: '',
    codigo_postal: '',
    barrio: '',
    notas: '',
  }
  const [showDirModal, setShowDirModal] = useState(false)
  const [editingDir, setEditingDir] = useState(null) // null = new, object = edit
  const [dirForm, setDirForm] = useState(EMPTY_DIR)
  const [savingDir, setSavingDir] = useState(false)
  const [dirError, setDirError] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        telefono: user.telefono || '',
        correo: user.correo || '',
        direccion: user.direccion || '',
        descripcion: user.descripcion || '',
        categoria_productos: user.categoria_productos || '',
      })
      setInlineBio(user.descripcion || '')
    }

    if (userId) {
      Promise.allSettled([
        listarDirecciones(userId),
        historialUsuario(userId),
      ]).then(([dirRes, compRes]) => {
        if (dirRes.status === 'fulfilled') {
          setDirecciones(dirRes.value.data?.direcciones || dirRes.value.data || [])
        }
        if (compRes.status === 'fulfilled') {
          setCompras(compRes.value.data?.compras || compRes.value.data || [])
        }
        setLoading(false)
      })
    }
  }, [userId, user])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const res = await actualizarPerfil(userId, {
        nombre: formData.nombre,
        email: formData.correo,
        username: user?.apodo || user?.username,
        telefono: formData.telefono,
        direccion: formData.direccion,
        descripcion: formData.descripcion,
        categoria_productos: formData.categoria_productos,
      })
      setMessage('¡Perfil y biografía actualizados exitosamente!')
      if (res.data?.usuario) {
        login(localStorage.getItem('jwt'), res.data.usuario)
      } else {
        await refreshUser()
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al actualizar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveInlineBio = async () => {
    setSavingBio(true)
    setError('')
    setMessage('')
    try {
      const res = await actualizarPerfil(userId, { descripcion: inlineBio })
      setMessage('¡Biografía actualizada con éxito!')
      setIsEditingBio(false)
      if (res.data?.usuario) {
        login(localStorage.getItem('jwt'), res.data.usuario)
      } else {
        await refreshUser()
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al guardar la biografía.')
    } finally {
      setSavingBio(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vista previa instantánea
    const objectUrl = URL.createObjectURL(file)
    setLocalAvatarPreview(objectUrl)

    setUploadingAvatar(true)
    setError('')
    setMessage('')
    try {
      const res = await subirAvatar(userId, file)
      setMessage('¡Foto de perfil actualizada con éxito!')
      setImgKey(Date.now())
      if (res.data?.usuario) {
        login(localStorage.getItem('jwt'), res.data.usuario)
      } else {
        await refreshUser()
      }
    } catch (err) {
      setLocalAvatarPreview(null)
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al subir foto de perfil.')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vista previa instantánea
    const objectUrl = URL.createObjectURL(file)
    setLocalCoverPreview(objectUrl)

    setUploadingCover(true)
    setError('')
    setMessage('')
    try {
      const res = await subirPortada(userId, file)
      setMessage('¡Foto de portada actualizada con éxito!')
      setImgKey(Date.now())
      if (res.data?.usuario) {
        login(localStorage.getItem('jwt'), res.data.usuario)
      } else {
        await refreshUser()
      }
    } catch (err) {
      setLocalCoverPreview(null)
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al subir foto de portada.')
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const handleRefreshUser = async () => {
    try {
      await refreshUser()
      setMessage('Datos de usuario actualizados.')
    } catch (err) {
      setError('Error al actualizar datos de usuario.')
    }
  }

  const handleDeleteDir = async (idDir) => {
    const ok = await confirm({
      title: '¿Eliminar dirección?',
      message: 'Esta dirección será eliminada permanentemente de tu perfil.',
      danger: true,
    })
    if (!ok) return
    try {
      await eliminarDireccion(userId, idDir)
      setDirecciones((prev) => prev.filter((d) => (d.id_direccion || d.id) !== idDir))
      toast.success('Dirección eliminada.')
    } catch {
      toast.error('Error al eliminar la dirección.')
    }
  }

  const openAddDir = () => {
    setEditingDir(null)
    setDirForm({
      ...EMPTY_DIR,
      telefono: user?.telefono || '',
    })
    setDirError('')
    setShowDirModal(true)
  }

  const openEditDir = (dir) => {
    setEditingDir(dir)
    setDirForm({
      titulo: dir.titulo || 'Principal',
      direccion_principal: dir.direccion_principal || dir.direccion || '',
      departamento: dir.departamento || 'Bolívar',
      ciudad: dir.ciudad || dir.municipio || '',
      telefono: dir.telefono || user?.telefono || '',
      codigo_postal: dir.codigo_postal || '',
      barrio: dir.barrio || '',
      notas: dir.notas || dir.indicaciones || '',
    })
    setDirError('')
    setShowDirModal(true)
  }

  const handleSaveDir = async (e) => {
    e.preventDefault()
    if (!dirForm.direccion_principal.trim() || !dirForm.departamento.trim() || !dirForm.ciudad.trim()) {
      setDirError('Dirección principal, departamento y ciudad son obligatorios.')
      return
    }
    setSavingDir(true)
    setDirError('')

    const payload = {
      titulo: dirForm.titulo.trim() || 'Principal',
      direccion_principal: dirForm.direccion_principal.trim(),
      departamento: dirForm.departamento.trim(),
      ciudad: dirForm.ciudad.trim(),
      telefono: dirForm.telefono?.trim() || user?.telefono || '',
      codigo_postal: dirForm.codigo_postal?.trim() || '',
      notas: dirForm.notas?.trim() || (dirForm.barrio ? `Barrio: ${dirForm.barrio}` : ''),
      // aliases para total compatibilidad
      direccion: dirForm.direccion_principal.trim(),
      municipio: dirForm.ciudad.trim(),
      barrio: dirForm.barrio?.trim() || '',
      indicaciones: dirForm.notas?.trim() || '',
    }

    try {
      if (editingDir) {
        const dirId = editingDir.id_direccion || editingDir.id
        const res = await actualizarDireccion(userId, dirId, payload)
        const updated = res.data?.direccion || { ...editingDir, ...payload }
        setDirecciones((prev) => prev.map((d) => (d.id_direccion || d.id) === dirId ? { ...d, ...updated } : d))
        toast.success('Dirección actualizada correctamente.')
      } else {
        const res = await agregarDireccion(userId, payload)
        const nueva = res.data?.direccion || { ...payload, id_direccion: res.data?.id_direccion || Date.now() }
        setDirecciones((prev) => [...prev, nueva])
        toast.success('¡Dirección guardada con éxito!')
      }
      setShowDirModal(false)
    } catch (err) {
      setDirError(err.response?.data?.error || err.response?.data?.message || 'Error al guardar la dirección.')
    } finally {
      setSavingDir(false)
    }
  }

  const formatCOP = (val) =>
    Number(val || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  const coverImg = localCoverPreview || (
    user?.foto_portada?.startsWith('http')
      ? user.foto_portada
      : user?.foto_portada
      ? (user.foto_portada.startsWith('/uploads') ? user.foto_portada : `/uploads/${user.foto_portada}`) + `?t=${imgKey}`
      : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80'
  )

  const avatarImg = localAvatarPreview || (
    user?.avatar?.startsWith('http')
      ? user.avatar
      : user?.avatar
      ? (user.avatar.startsWith('/uploads') ? user.avatar : `/uploads/${user.avatar}`) + `?t=${imgKey}`
      : '/img/logo vaca.png'
  )

  const isVendorUser = user?.id_rol === 2
  const roleLabel =
    user?.id_rol === 1
      ? 'Administrador del Sistema'
      : user?.id_rol === 2
      ? 'Productor / Vendedor Campesino'
      : 'Comprador Verificado'

  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="app-container">
          {/* Panoramic Hero Card */}
          <div className="vendor-profile-hero-card fade-in">
            <div className="vendor-profile-cover-wrap">
              <img
                src={coverImg}
                alt={`Portada de ${user?.nombre || 'Mi Perfil'}`}
                className="vendor-profile-cover-img"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80'
                }}
              />
              <div className="vendor-profile-cover-overlay" />
              
              {/* Botón Tipo Lápiz Semitransparente para Subir Portada desde la PC */}
              <label htmlFor="cover-file-input" className="vendor-cover-edit-btn" title="Cambiar foto de portada">
                <i className={`fa ${uploadingCover ? 'fa-spinner fa-spin' : 'fa-pencil-alt'}`} />
                <span>{uploadingCover ? 'Subiendo...' : 'Editar Portada'}</span>
                <input
                  id="cover-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                />
              </label>
            </div>

            <div className="vendor-profile-hero-body">
              <div className="vendor-profile-hero-top">
                <div className="vendor-profile-avatar-container">
                  <img
                    src={avatarImg}
                    alt={user?.nombre || 'Mi Perfil'}
                    className="vendor-profile-avatar-img"
                    onError={(e) => { e.target.src = '/img/logo vaca.png' }}
                  />

                  {/* Botón Tipo Lápiz Semitransparente para Subir Foto de Perfil */}
                  <label htmlFor="avatar-file-input" className="vendor-avatar-edit-btn" title="Cambiar foto de perfil">
                    <i className={`fa ${uploadingAvatar ? 'fa-spinner fa-spin' : 'fa-pencil-alt'}`} />
                    <input
                      id="avatar-file-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>

                <div className="vendor-profile-header-actions">
                  {isVendorUser && (
                    <Link to="/vendedor" className="btn btn-primary">
                      <i className="fa fa-store" /> Centro de Ventas
                    </Link>
                  )}
                  {user?.id_rol === 1 && (
                    <Link to="/admin" className="btn btn-secondary">
                      <i className="fa fa-shield-alt" /> Panel Admin
                    </Link>
                  )}
                  <Link to={`/vendedor/${userId}`} className="btn btn-outline-success">
                    <i className="fa fa-eye" /> Ver Mi Perfil Público
                  </Link>
                </div>
              </div>

              {/* Identity & Bio */}
              <div className="vendor-profile-info-section">
                <div className="vendor-profile-title-row">
                  <h2>{user?.nombre || 'Usuario'}</h2>
                  <span className="vendor-profile-badge-pill">
                    <i className="fa fa-shield-alt" /> {roleLabel}
                  </span>
                </div>

                <p className="vendor-profile-handle">@{user?.apodo || user?.username || 'usuario'}</p>

                {user?.direccion && (
                  <div className="vendor-profile-origin">
                    <i className="fa fa-map-marker-alt text-primary" />
                    <span><strong>Ubicación / Finca:</strong> {user.direccion}</span>
                  </div>
                )}

                {/* Description / Bio Box (Directamente Editable) */}
                <div className="vendor-profile-description-box">
                  {isEditingBio ? (
                    <div className="fade-in" style={{ width: '100%' }}>
                      <textarea
                        rows={3}
                        className="form-textarea"
                        placeholder="Escribe una breve descripción o historia sobre ti o tu labor en el campo..."
                        value={inlineBio}
                        onChange={(e) => setInlineBio(e.target.value)}
                        autoFocus
                        style={{ fontSize: '0.95rem', marginBottom: '0.65rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setInlineBio(user?.descripcion || '')
                            setIsEditingBio(false)
                          }}
                          disabled={savingBio}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handleSaveInlineBio}
                          disabled={savingBio}
                        >
                          {savingBio ? <i className="fa fa-spinner fa-spin" /> : <i className="fa fa-check" />} Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsEditingBio(true)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: '0.75rem', width: '100%' }}
                      title="Haz clic para editar tu descripción"
                    >
                      <p style={{ margin: 0, flex: 1, color: user?.descripcion ? 'inherit' : 'var(--text-muted)' }}>
                        {user?.descripcion || <em>Añade una breve biografía o historia de tu labor campesina... (Haz clic para escribir)</em>}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsEditingBio(true)
                        }}
                        className="vendor-bio-edit-btn"
                        title="Editar descripción"
                      >
                        <i className="fa fa-pencil-alt" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category Tags */}
                {user?.categoria_productos && (
                  <div className="vendor-profile-tags-row">
                    <span className="tags-label">Especialidades:</span>
                    <div className="tags-list">
                      {user.categoria_productos.split(',').map((cat, i) => (
                        <span key={i} className="badge badge-primary">
                          {cat.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="profile-tabs">
            <button
              className={`profile-tab-btn ${activeTab === 'perfil' ? 'active' : ''}`}
              onClick={() => setActiveTab('perfil')}
            >
              <i className="fa fa-user" /> Datos Personales {isVendorUser && '& Perfil de Vendedor'}
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'pedidos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pedidos')}
            >
              <i className="fa fa-receipt" /> Mis Compras ({compras.length})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'direcciones' ? 'active' : ''}`}
              onClick={() => setActiveTab('direcciones')}
            >
              <i className="fa fa-map-marked-alt" /> Direcciones Guardadas ({direcciones.length})
            </button>
          </div>

          {/* Tab 1: Datos Personales & Perfil de Vendedor */}
          {activeTab === 'perfil' && (
            <div id="seccion-editar-perfil" className="card fade-in" style={{ marginTop: '1.5rem', padding: '2rem' }}>
              <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa fa-id-card text-primary" /> Información de tu Cuenta y Perfil
                </h3>
              </div>

              {message && (
                <div className="alert alert-success fade-in" style={{ marginBottom: '1.5rem' }}>
                  <i className="fa fa-check-circle" /> {message}
                </div>
              )}
              {error && (
                <div className="alert alert-danger fade-in" style={{ marginBottom: '1.5rem' }}>
                  <i className="fa fa-exclamation-circle" /> {error}
                </div>
              )}

              <form onSubmit={handleUpdateProfile}>
                {/* Sección 1: Datos Personales y Contacto */}
                <div className="card" style={{ background: 'var(--bg-alt, #f8f9fa)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.75rem' }}>
                  <h4 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                    <i className="fa fa-user" /> Datos Personales y de Contacto
                  </h4>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Roberto Carlos Salcedo"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Teléfono / WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="Ej: 3101234567"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="form-input"
                      />
                      <small className="text-muted">Número de contacto para compradores y soporte.</small>
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Ubicación / Finca / Vereda</label>
                      <input
                        type="text"
                        placeholder="Ej: Vereda San Jacinto, Bolívar - Finca El Progreso"
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Correo Electrónico (Registrado)</label>
                      <input
                        type="email"
                        disabled
                        value={formData.correo}
                        className="form-input"
                        style={{ opacity: 0.75, cursor: 'not-allowed', backgroundColor: 'var(--bg-card)' }}
                      />
                      <small className="text-muted">El correo está vinculado a tu seguridad de acceso.</small>
                    </div>
                  </div>

                  {isVendorUser && (
                    <div className="form-group" style={{ marginTop: '1.25rem' }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Especialidades / Categorías de Cosechas</label>
                      <input
                        type="text"
                        placeholder="Ej: Ñame Criollo, Plátano Hartón, Yuca, Frutas Tropicales, Miel de Abejas"
                        value={formData.categoria_productos}
                        onChange={(e) => setFormData({ ...formData, categoria_productos: e.target.value })}
                        className="form-input"
                      />
                      <small className="text-muted">Separa con comas las cosechas o productos en los que te especializas.</small>
                    </div>
                  )}
                </div>

                {/* Botón Guardar Cambios */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="submit" disabled={saving} className="btn btn-primary btn-lg" style={{ padding: '0.85rem 2.25rem', fontSize: '1.05rem' }}>
                    {saving ? (
                      <><i className="fa fa-spinner fa-spin" /> Guardando Cambios...</>
                    ) : (
                      <><i className="fa fa-save" /> Guardar Cambios</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Mis Pedidos */}
          {activeTab === 'pedidos' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa fa-receipt text-primary" /> Historial de Pedidos
                </h3>
              </div>
              {loading ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : compras.length > 0 ? (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Fecha</th>
                        <th>Método</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Factura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.map((compra) => (
                        <tr key={compra.id_compra || compra.id}>
                          <td><strong>#{compra.id_compra || compra.id}</strong></td>
                          <td>{new Date(compra.fecha || Date.now()).toLocaleDateString('es-CO')}</td>
                          <td><span className="badge badge-info">{compra.metodo_pago || 'Contra Entrega'}</span></td>
                          <td><strong>{formatCOP(compra.total)}</strong></td>
                          <td>
                            <span className={`badge ${compra.estado === 'entregado' ? 'badge-success' : compra.estado === 'cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                              {compra.estado || 'En Proceso'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="inv-row-btn"
                              onClick={() => setInvoiceId(compra.id_compra || compra.id)}
                              title="Ver factura electrónica"
                            >
                              <i className="fa fa-file-invoice" /> Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa fa-receipt empty-state-icon" />
                  <h4>No has realizado compras aún</h4>
                  <p>Tus compras y recibos aparecerán aquí una vez realices tu primer pedido.</p>
                </div>
              )}

              {invoiceId && (
                <InvoiceModal
                  idCompra={invoiceId}
                  userEmail={user?.correo}
                  onClose={() => setInvoiceId(null)}
                />
              )}
            </div>
          )}

          {/* Tab 3: Direcciones */}
          {activeTab === 'direcciones' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem', padding: '2rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                  <i className="fa fa-map-marker-alt" /> Mis Direcciones de Envío
                </h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openAddDir}
                >
                  <i className="fa fa-plus" /> Añadir Nueva Dirección
                </button>
              </div>

              {direcciones.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {direcciones.map((dir) => {
                    const dirId = dir.id_direccion || dir.id
                    const titulo = dir.titulo || 'Dirección de Envío'
                    const direccionPrincipal = dir.direccion_principal || dir.direccion || ''
                    const ciudad = dir.ciudad || dir.municipio || ''
                    const depto = dir.departamento || ''
                    const fullAddr = [direccionPrincipal, ciudad, depto].filter(Boolean).join(', ')

                    return (
                      <div
                        key={dirId}
                        style={{
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          padding: '1.25rem 1.5rem',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'all 0.2s ease',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <i className="fa fa-map-marker-alt" style={{ color: 'var(--primary-color)' }} /> {titulo}
                          </h4>
                          <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                            {fullAddr}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
                            {dir.telefono && (
                              <span><i className="fa fa-phone" style={{ marginRight: '4px' }} /> {dir.telefono}</span>
                            )}
                            {dir.codigo_postal && (
                              <span><i className="fa fa-mail-bulk" style={{ marginRight: '4px' }} /> CP: {dir.codigo_postal}</span>
                            )}
                            {dir.barrio && (
                              <span className="badge badge-primary" style={{ textTransform: 'none', padding: '0.15rem 0.5rem' }}>
                                Barrio {dir.barrio}
                              </span>
                            )}
                          </div>
                          {(dir.notas || dir.indicaciones) && (
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              <i className="fa fa-sticky-note" style={{ marginRight: '4px', color: 'var(--primary-color)' }} /> {dir.notas || dir.indicaciones}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => openEditDir(dir)}
                            style={{
                              background: 'var(--primary-subtle, #f0fdf4)',
                              border: '1px solid #dcfce7',
                              color: 'var(--primary-color, #10b981)',
                              cursor: 'pointer',
                              width: '38px',
                              height: '38px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              transition: 'all 0.2s',
                            }}
                            title="Editar Dirección"
                          >
                            <i className="fa fa-pencil-alt" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDir(dirId)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fee2e2',
                              color: '#ef4444',
                              cursor: 'pointer',
                              width: '38px',
                              height: '38px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              transition: 'all 0.2s',
                            }}
                            title="Eliminar Dirección"
                          >
                            <i className="fa fa-trash-alt" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <i className="fa fa-map-marked-alt empty-state-icon" style={{ fontSize: '3rem', color: 'var(--text-subtle)', marginBottom: '1rem' }} />
                  <h4>No tienes direcciones guardadas</h4>
                  <p className="text-muted">Guarda tus ubicaciones frecuentes para despachos y compras más rápidos.</p>
                  <button type="button" className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={openAddDir}>
                    <i className="fa fa-plus" /> Añadir mi primera dirección
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Modal Formulario de Dirección (Estilo idéntico a Categorías / Admin) ── */}
      {showDirModal && (
        <div
          className="modal-overlay fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            boxSizing: 'border-box',
          }}
          onClick={() => setShowDirModal(false)}
        >
          <div
            className="modal-content card"
            style={{
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem 2.25rem',
              borderRadius: '16px',
              backgroundColor: 'var(--card-bg, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.85rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)' }}>
                <i
                  className={`fa ${editingDir ? 'fa-pencil-alt' : 'fa-map-marked-alt'}`}
                  style={{ color: editingDir ? 'var(--warning-color, #f59e0b)' : 'var(--primary-color, #16a34a)' }}
                />
                {editingDir ? 'Editar Dirección de Envío' : 'Registrar Dirección de Envío'}
              </h3>
              <button
                type="button"
                onClick={() => setShowDirModal(false)}
                className="btn-icon"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: 'var(--text-muted)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                }}
                title="Cerrar"
              >
                <i className="fa fa-times" />
              </button>
            </div>

            {dirError && (
              <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                <i className="fa fa-exclamation-circle" /> {dirError}
              </div>
            )}

            <form onSubmit={handleSaveDir}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Título de Identificación *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mi Casa / Finca El Carmen"
                    value={dirForm.titulo}
                    onChange={(e) => setDirForm({ ...dirForm, titulo: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Celular / Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 3001234567"
                    value={dirForm.telefono}
                    onChange={(e) => setDirForm({ ...dirForm, telefono: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.2rem' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Dirección Principal o Vereda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Calle, Carrera, Avenida, Número, Vereda..."
                  value={dirForm.direccion_principal}
                  onChange={(e) => setDirForm({ ...dirForm, direccion_principal: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1.2rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Departamento *
                  </label>
                  <select
                    required
                    value={dirForm.departamento}
                    onChange={(e) => {
                      const dept = e.target.value
                      const munis = getMunicipiosPorDepartamento(dept)
                      setDirForm({ ...dirForm, departamento: dept, ciudad: munis[0] || '' })
                    }}
                    className="form-select"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box', backgroundColor: 'var(--card-bg, #ffffff)', color: 'var(--text-main)' }}
                  >
                    {COLOMBIAN_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Ciudad / Municipio *
                  </label>
                  <select
                    required
                    value={dirForm.ciudad}
                    onChange={(e) => setDirForm({ ...dirForm, ciudad: e.target.value })}
                    className="form-select"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box', backgroundColor: 'var(--card-bg, #ffffff)', color: 'var(--text-main)' }}
                  >
                    <option value="">-- Selecciona Municipio --</option>
                    {getMunicipiosPorDepartamento(dirForm.departamento).map((muni) => (
                      <option key={muni} value={muni}>
                        {muni}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1.2rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Barrio / Sector (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Barrio El Centro"
                    value={dirForm.barrio}
                    onChange={(e) => setDirForm({ ...dirForm, barrio: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Código Postal (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 130001"
                    value={dirForm.codigo_postal}
                    onChange={(e) => setDirForm({ ...dirForm, codigo_postal: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.2rem' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.45rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Instrucciones / Indicaciones Especiales (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Ej: Portón verde, casa esquinera frente al parque..."
                  value={dirForm.notas}
                  onChange={(e) => setDirForm({ ...dirForm, notas: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDirModal(false)}
                  className="btn btn-secondary"
                  disabled={savingDir}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDir}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.75rem', borderRadius: '8px' }}
                >
                  {savingDir ? (
                    <><i className="fa fa-spinner fa-spin" /> Guardando...</>
                  ) : (
                    <><i className="fa fa-save" /> {editingDir ? 'Guardar Cambios' : 'Guardar Dirección'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
