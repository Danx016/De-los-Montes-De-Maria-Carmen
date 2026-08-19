import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { listarProductos, crearProducto, actualizarProducto, eliminarProducto, listarCategoriasPublicas } from '../api/productos.api'
import { listarTodasVendedor, actualizarEstadoDespacho } from '../api/compras.api'
import { convertirseEnVendedor } from '../api/usuario.api'

export default function VendedorPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { user, login, isVendedor, isAdmin } = useAuth()
  const isSeller = isVendedor || isAdmin || Number(user?.id_rol ?? user?.rol) === 2 || Number(user?.id_rol ?? user?.rol) === 1

  // Estado para unirse como vendedor
  const [becomingSeller, setBecomingSeller] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')
  const [sellerForm, setSellerForm] = useState({
    descripcion: '',
    categoria_productos: 'Cosechas Frescas y Productos Locales',
    telefono: user?.telefono || '',
    direccion: user?.direccion || ''
  })

  const [activeTab, setActiveTab] = useState('productos') // 'productos' | 'ventas'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [prodSearch, setProdSearch] = useState('')
  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [categoriasList, setCategoriasList] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal de Crear/Editar Producto
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [prodForm, setProdForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: 'cosechas',
    unidad_medida: 'Kg',
    origen: '',
    presentacion: '',
    cuidado: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleBecomeSeller = async (e) => {
    e?.preventDefault()
    setBecomingSeller(true)
    setJoinError('')
    setJoinSuccess('')
    try {
      const res = await convertirseEnVendedor({
        descripcion: sellerForm.descripcion || `Finca y cosechas de ${user?.nombre || user?.username || 'productor local'}`,
        categoria_productos: sellerForm.categoria_productos || 'Cosechas Frescas y Productos Locales',
        telefono: sellerForm.telefono || user?.telefono || '',
        direccion: sellerForm.direccion || user?.direccion || ''
      })
      const token = res.data?.token
      const updatedUser = res.data?.usuario
      if (token && updatedUser) {
        login(token, updatedUser)
        setJoinSuccess('¡Felicitaciones! Tu cuenta ha sido activada como vendedor con éxito.')
      }
    } catch (err) {
      setJoinError(err.response?.data?.error || err.response?.data?.message || 'Error al unirse como vendedor.')
    } finally {
      setBecomingSeller(false)
    }
  }

  const loadData = () => {
    setLoading(true)
    const currentUserId = user?.id || user?.id_usuario

    Promise.allSettled([
      listarProductos(),
      listarTodasVendedor(),
      listarCategoriasPublicas(),
    ]).then(([prodRes, ventRes, catRes]) => {
      if (prodRes.status === 'fulfilled') {
        const todos = prodRes.value.data?.productos || prodRes.value.data || []
        // Filtrar estrictamente los productos de este vendedor individual
        const misProductos = todos.filter(
          (p) => String(p.id_vendedor) === String(currentUserId) || String(p.id_proveedor) === String(currentUserId)
        )
        setProductos(misProductos)
      }
      if (ventRes.status === 'fulfilled') {
        setVentas(ventRes.value.data?.compras || ventRes.value.data || [])
      }
      if (catRes.status === 'fulfilled') {
        setCategoriasList(catRes.value.data || [])
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleOpenCreate = () => {
    setEditingId(null)
    setProdForm({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      categoria: 'cosechas',
      unidad_medida: 'Kg',
      origen: user?.municipio ? `${user.municipio}, Montes de María` : 'Montes de María, Colombia',
      presentacion: 'Empaque fresco de finca',
      cuidado: 'Conservar en lugar fresco y seco',
    })
    setImageFile(null)
    setError('')
    setShowModal(true)
  }

  const handleOpenEdit = (prod) => {
    setEditingId(prod.id_producto)
    setProdForm({
      nombre: prod.nombre || prod.nombre_producto || '',
      descripcion: prod.descripcion || '',
      precio: prod.precio || '',
      stock: prod.stock || '',
      categoria: prod.categoria || 'cosechas',
      unidad_medida: prod.unidad_medida || 'Kg',
      origen: prod.origen || '',
      presentacion: prod.presentacion || '',
      cuidado: prod.cuidado || '',
    })
    setImageFile(null)
    setError('')
    setShowModal(true)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const formData = new FormData()
    formData.append('nombre', prodForm.nombre)
    formData.append('descripcion', prodForm.descripcion)
    formData.append('precio', prodForm.precio)
    formData.append('stock', prodForm.stock)
    formData.append('categoria', prodForm.categoria)
    formData.append('unidad_medida', prodForm.unidad_medida)
    formData.append('origen', prodForm.origen)
    formData.append('presentacion', prodForm.presentacion)
    formData.append('cuidado', prodForm.cuidado)
    if (imageFile) {
      formData.append('imageFile', imageFile)
    }

    try {
      if (editingId) {
        await actualizarProducto(editingId, formData)
      } else {
        await crearProducto(formData)
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: '¿Eliminar producto?',
      message: 'Este producto se eliminará permanentemente de tu catálogo.',
      danger: true,
    })
    if (!ok) return
    try {
      await eliminarProducto(id)
      setProductos((prev) => prev.filter((p) => p.id_producto !== id))
    } catch {
      toast.error('Error al eliminar el producto.')
    }
  }

  const handleUpdateStatus = async (idCompra, nuevoEstado) => {
    try {
      await actualizarEstadoDespacho(idCompra, { estado: nuevoEstado })
      toast.success('¡Estado actualizado y correo de notificación enviado al cliente!')
      loadData()
    } catch {
      toast.error('Error al actualizar el estado de la venta.')
    }
  }

  const getStatusBadge = (estado) => {
    const raw = String(estado || '').toLowerCase().trim()
    if (raw.includes('entreg')) return { label: 'Entregado con Éxito', className: 'badge-success', icon: 'fa fa-check-circle' }
    if (raw.includes('repart') || raw.includes('local')) return { label: 'En Reparto Local', className: 'badge-primary', icon: 'fa fa-motorcycle' }
    if (raw.includes('camino') || raw.includes('despach')) return { label: 'En Camino', className: 'badge-info', icon: 'fa fa-truck' }
    if (raw.includes('empa') || raw.includes('listo')) return { label: 'Empacado', className: 'badge-info', icon: 'fa fa-box' }
    if (raw.includes('confirm') || raw.includes('prepar')) return { label: 'En Preparación (Finca)', className: 'badge-primary', icon: 'fa fa-seedling' }
    if (raw.includes('cancel')) return { label: 'Cancelado', className: 'badge-danger', icon: 'fa fa-times-circle' }
    if (raw.includes('reembols')) return { label: 'Reembolsado', className: 'badge-secondary', icon: 'fa fa-undo' }
    return { label: 'Pendiente', className: 'badge-warning', icon: 'fa fa-clock' }
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

      {/* Modal / Alerta de Confirmación para nuevos vendedores */}
      {!isSeller && (
        <div
          className="modal-backdrop fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="modal-card fade-in"
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(46,125,50,0.15), rgba(76,175,80,0.25))',
                color: 'var(--primary-color, #2e7d32)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 1.25rem auto'
              }}
            >
              <i className="fa fa-store" />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.6rem', color: 'var(--text-main, #242424)' }}>
              ¿Quieres unirte como Vendedor?
            </h2>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted, #666666)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Actualmente estás registrado como <strong>Comprador</strong>. Activa tu perfil de vendedor con un solo clic para publicar tus cosechas y fijar tus precios en <em>De los Montes de María</em>.
            </p>

            <div
              style={{
                background: 'var(--primary-subtle, rgba(46,125,50,0.08))',
                border: '1px solid rgba(46,125,50,0.2)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                color: 'var(--primary-color, #2e7d32)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                textAlign: 'left'
              }}
            >
              <i className="fa fa-check-circle" style={{ fontSize: '1.2rem', flexShrink: 0 }} />
              <span>
                <strong>¡Cuenta 2 en 1!</strong> Podrás seguir comprando como cliente y vender productos del campo con este mismo usuario.
              </span>
            </div>

            {joinError && (
              <div className="global-alert error fade-in" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <i className="fa fa-exclamation-circle" /> {joinError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary"
                style={{ minWidth: '120px', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600 }}
              >
                <i className="fa fa-arrow-left" /> Ahora no
              </button>

              <button
                type="button"
                onClick={handleBecomeSeller}
                disabled={becomingSeller}
                className="btn btn-primary"
                style={{
                  minWidth: '180px',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #2e7d32 0%, #438e44 100%)',
                  boxShadow: '0 4px 12px rgba(46,125,50,0.3)'
                }}
              >
                {becomingSeller ? (
                  <><i className="fa fa-spinner fa-spin" /> Activando...</>
                ) : (
                  <><i className="fa fa-check" /> ¡Sí, activar y vender!</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="app-container">
          {joinSuccess && (
            <div className="global-alert success fade-in" style={{ marginBottom: '1.5rem' }}>
              <i className="fa fa-check-circle" /> {joinSuccess}
            </div>
          )}

          <div className="vendedor-header-row">
            <div>
              <span className="badge badge-success">Panel de Control</span>
              <h1>Centro de Ventas Agropecuarias</h1>
              <p className="text-muted">Gestiona tus cosechas, insumos y pedidos despachados.</p>
            </div>
            <button onClick={handleOpenCreate} className="btn btn-primary btn-lg">
              <i className="fa fa-plus" /> Publicar Nuevo Producto
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="profile-tabs" style={{ marginTop: '1.5rem' }}>
            <button
              className={`profile-tab-btn ${activeTab === 'productos' ? 'active' : ''}`}
              onClick={() => setActiveTab('productos')}
            >
              <i className="fa fa-box" /> Mis Productos ({productos.length})
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'ventas' ? 'active' : ''}`}
              onClick={() => setActiveTab('ventas')}
            >
              <i className="fa fa-truck-loading" /> Pedidos por Despachar ({ventas.length})
            </button>
          </div>

          {/* Products List */}
          {activeTab === 'productos' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <div className="seller-view-controls">
                <div>
                  <h3 style={{ margin: 0 }}>Mis Productos en Venta ({productos.length})</h3>
                  <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    Gestiona tu inventario, actualiza precios, existencias y fotos de tus cosechas.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Buscador interno */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <input
                      type="text"
                      placeholder="Filtrar mis productos..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      className="form-input form-input-sm"
                    />
                  </div>

                  {/* Toggle Vista */}
                  <div className="view-mode-toggle">
                    <button
                      className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                      title="Vista en Cuadrícula"
                    >
                      <i className="fa fa-th-large" /> Tarjetas
                    </button>
                    <button
                      className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setViewMode('table')}
                      title="Vista en Tabla"
                    >
                      <i className="fa fa-list" /> Tabla
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : productos.length > 0 ? (
                (() => {
                  const filtered = productos.filter((p) => {
                    const q = prodSearch.toLowerCase()
                    return (
                      !q ||
                      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
                      (p.nombre_producto && p.nombre_producto.toLowerCase().includes(q)) ||
                      (p.categoria && p.categoria.toLowerCase().includes(q))
                    )
                  })

                  if (filtered.length === 0) {
                    return (
                      <div className="empty-state">
                        <i className="fa fa-search empty-state-icon" />
                        <h4>No hay coincidencias</h4>
                        <p>No se encontraron productos con el término de búsqueda.</p>
                      </div>
                    )
                  }

                  if (viewMode === 'grid') {
                    return (
                      <div className="seller-products-grid" style={{ marginTop: '1rem' }}>
                        {filtered.map((prod) => {
                          const img = prod.imagen?.startsWith('http')
                            ? prod.imagen
                            : prod.imagen
                            ? `/uploads/${prod.imagen}`
                            : '/img/Logo.jpg'

                          const title = prod.nombre || prod.nombre_producto

                          return (
                            <div key={prod.id_producto} className="seller-item-card">
                              <div className="seller-item-media">
                                <img
                                  src={img}
                                  alt={title}
                                  className="seller-item-img"
                                  onError={(e) => { e.target.src = '/img/Logo.jpg' }}
                                />
                                <div className="seller-item-badges">
                                  <span className="badge badge-primary">
                                    {prod.categoria}
                                  </span>
                                  <span className={`badge ${prod.stock > 5 ? 'badge-success' : prod.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                    {prod.stock} disponibles
                                  </span>
                                </div>
                              </div>

                              <div className="seller-item-body">
                                <h4 className="seller-item-title" title={title}>{title}</h4>
                                <p className="seller-item-desc">
                                  {prod.descripcion || 'Sin descripción detallada.'}
                                </p>

                                <div className="seller-item-footer">
                                  <div className="seller-item-price">
                                    <span className="seller-item-price-label">Precio</span>
                                    <span className="seller-item-price-val">{formatCOP(prod.precio)}</span>
                                  </div>

                                  <div className="seller-item-actions">
                                    <button
                                      onClick={() => handleOpenEdit(prod)}
                                      className="btn btn-outline-primary btn-sm"
                                      title="Editar Producto"
                                    >
                                      <i className="fa fa-edit" /> Editar
                                    </button>
                                    <button
                                      onClick={() => handleDelete(prod.id_producto)}
                                      className="btn btn-danger btn-sm"
                                      title="Eliminar Producto"
                                    >
                                      <i className="fa fa-trash-alt" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }

                  return (
                    <div className="orders-table-wrapper" style={{ marginTop: '1rem' }}>
                      <table className="orders-table">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Imagen</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((prod) => {
                            const img = prod.imagen?.startsWith('http')
                              ? prod.imagen
                              : prod.imagen
                              ? `/uploads/${prod.imagen}`
                              : '/img/Logo.jpg'

                            const title = prod.nombre || prod.nombre_producto

                            return (
                              <tr key={prod.id_producto}>
                                <td>
                                  <img
                                    src={img}
                                    alt={title}
                                    className="table-thumb"
                                    onError={(e) => { e.target.src = '/img/Logo.jpg' }}
                                  />
                                </td>
                                <td>
                                  <strong>{title}</strong>
                                  {prod.descripcion && <p className="table-desc">{prod.descripcion.slice(0, 60)}...</p>}
                                </td>
                                <td><span className="badge badge-primary">{prod.categoria}</span></td>
                                <td><strong>{formatCOP(prod.precio)}</strong></td>
                                <td>
                                  <span className={`badge ${prod.stock > 5 ? 'badge-success' : prod.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                    {prod.stock} disp.
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="table-actions-row" style={{ justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleOpenEdit(prod)} className="btn-icon" title="Editar">
                                      <i className="fa fa-edit" />
                                    </button>
                                    <button onClick={() => handleDelete(prod.id_producto)} className="btn-icon-danger" title="Eliminar">
                                      <i className="fa fa-trash-alt" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()
              ) : (
                <div className="empty-state">
                  <i className="fa fa-box-open empty-state-icon" />
                  <h4>No has publicado productos todavía</h4>
                  <p>Comienza a vender tus productos campesinos haciendo clic en "Publicar Nuevo Producto".</p>
                </div>
              )}
            </div>
          )}

          {/* Ventas Tab */}
          {activeTab === 'ventas' && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <h3>Gestión de Despachos</h3>
              {ventas.length > 0 ? (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado Actual</th>
                        <th>Cambiar Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.map((v) => {
                        const badgeInfo = getStatusBadge(v.estado)
                        return (
                          <tr key={v.id_compra || v.id}>
                            <td><strong>#{v.id_compra || v.id}</strong></td>
                            <td>{v.cliente_nombre || v.usuario_nombre || 'Cliente Registrado'}</td>
                            <td><strong>{formatCOP(v.total)}</strong></td>
                            <td>
                              <span className={`badge ${badgeInfo.className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <i className={badgeInfo.icon} /> {badgeInfo.label}
                              </span>
                            </td>
                            <td>
                              <select
                                value={v.estado || 'pendiente'}
                                onChange={(e) => handleUpdateStatus(v.id_compra || v.id, e.target.value)}
                                className="form-select form-select-sm"
                                style={{ minWidth: '220px', fontWeight: 600 }}
                              >
                                <option value="pendiente">⏳ Pendiente (Recibido)</option>
                                <option value="confirmado">👨‍🌾 Confirmado / En Preparación en Finca</option>
                                <option value="empaquetado">📦 Empacado y Listo para Despacho</option>
                                <option value="en_camino">🚚 En Camino (Despachado)</option>
                                <option value="en_reparto">🛵 En Reparto Local (Llega Hoy)</option>
                                <option value="entregado">✅ Entregado con Éxito</option>
                                <option value="cancelado">❌ Cancelado</option>
                                <option value="reembolsado">💰 Reembolso Procesado</option>
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa fa-truck-loading empty-state-icon" />
                  <h4>No hay pedidos recibidos aún</h4>
                  <p>Cuando los clientes compren tus productos, podrás gestionar sus despachos aquí.</p>
                </div>
              )}
            </div>
          )}

          {/* Modal Crear / Editar Producto */}
          {showModal && (
            <div
              className="modal-backdrop fade-in"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowModal(false)
              }}
            >
              <div className="modal-card">
                <div className="modal-header">
                  <h3>
                    <i className="fa fa-seedling text-primary" />{' '}
                    {editingId ? 'Editar Producto' : 'Publicar Nuevo Producto'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="modal-close-btn"
                    title="Cerrar ventana"
                  >
                    <i className="fa fa-times" />
                  </button>
                </div>

                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                    <i className="fa fa-exclamation-circle" /> {error}
                  </div>
                )}

                <form onSubmit={handleSaveProduct}>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Queso Costeño Artesanal 1Kg"
                      value={prodForm.nombre}
                      onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Categoría *</label>
                      <select
                        value={prodForm.categoria}
                        onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })}
                        className="form-select"
                      >
                        {categoriasList.length > 0 ? (
                          categoriasList.map((cat) => (
                            <option key={cat.id_categoria || cat.slug} value={cat.slug || cat.nombre_categoria.toLowerCase()}>
                              {cat.nombre_categoria}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="cosechas">Cosechas Frescas</option>
                            <option value="lacteos">Lácteos Campesinos</option>
                            <option value="semillas">Semillas Nativas</option>
                            <option value="abonos">Abonos & Fertilizantes</option>
                            <option value="ferre">Ferretería Campesina</option>
                            <option value="agro">Maquinaria & AgroEquipos</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Precio (COP) *</label>
                      <input
                        type="number"
                        required
                        min="100"
                        placeholder="Ej: 25000"
                        value={prodForm.precio}
                        onChange={(e) => setProdForm({ ...prodForm, precio: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Stock / Cantidad *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Ej: 50"
                        value={prodForm.stock}
                        onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Descripción Detallada del Producto</label>
                    <textarea
                      rows={3}
                      placeholder="Describe la calidad, procedencia, método de cultivo o características..."
                      value={prodForm.descripcion}
                      onChange={(e) => setProdForm({ ...prodForm, descripcion: e.target.value })}
                      className="form-textarea"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        <i className="fa fa-map-marker-alt text-danger" /> Municipio / Vereda de Origen
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: El Carmen de Bolívar"
                        value={prodForm.origen}
                        onChange={(e) => setProdForm({ ...prodForm, origen: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        <i className="fa fa-box text-primary" /> Presentación / Empaque
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Bolsa 1Kg / Por Atado"
                        value={prodForm.presentacion}
                        onChange={(e) => setProdForm({ ...prodForm, presentacion: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        <i className="fa fa-weight-hanging text-info" /> Unidad de Medida
                      </label>
                      <select
                        value={prodForm.unidad_medida}
                        onChange={(e) => setProdForm({ ...prodForm, unidad_medida: e.target.value })}
                        className="form-select"
                      >
                        <option value="Kg">Kg (Kilogramo)</option>
                        <option value="Libra">Libra (500g)</option>
                        <option value="Unidad">Unidad / Pieza</option>
                        <option value="Litro">Litro / Botella</option>
                        <option value="Bulto">Bulto / Saco</option>
                        <option value="Atado">Atado / Racimo</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      <i className="fa fa-leaf text-success" /> Recomendaciones de Cuidado & Conservación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Mantener en lugar fresco y ventilado o refrigerar"
                      value={prodForm.cuidado}
                      onChange={(e) => setProdForm({ ...prodForm, cuidado: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Foto o Imagen del Producto</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      className="form-input"
                    />
                    {imageFile && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--primary-color)' }}>
                        <i className="fa fa-image" /> Archivo seleccionado: <strong>{imageFile.name}</strong>
                      </div>
                    )}
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ minWidth: '140px' }}
                    >
                      {saving ? (
                        <><i className="fa fa-spinner fa-spin" /> Guardando...</>
                      ) : (
                        <><i className="fa fa-save" /> {editingId ? 'Guardar Cambios' : 'Publicar Producto'}</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
