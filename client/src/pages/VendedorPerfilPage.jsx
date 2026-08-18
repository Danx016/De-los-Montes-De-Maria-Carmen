import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import { listarProductos } from '../api/productos.api'
import { obtenerPerfilVendedor } from '../api/usuario.api'

export default function VendedorPerfilPage() {
  const { id } = useParams()
  const [vendedor, setVendedor] = useState(null)
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todas')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      obtenerPerfilVendedor(id),
      listarProductos()
    ])
      .then(([vendedorRes, productosRes]) => {
        setVendedor(vendedorRes.data)
        const todos = productosRes.data?.productos || productosRes.data || []
        // Filtrar los productos pertenecientes a este vendedor
        const vendorProds = todos.filter(
          (p) => String(p.id_vendedor) === String(id) || String(p.id_proveedor) === String(id)
        )
        setProductos(vendorProds)
      })
      .catch((err) => {
        console.error('Error al cargar perfil de vendedor:', err)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Categorías únicas disponibles dentro de los productos del vendedor
  const availableCategories = useMemo(() => {
    const cats = new Set(productos.map((p) => p.categoria).filter(Boolean))
    return ['todas', ...Array.from(cats)]
  }, [productos])

  // Filtrado de productos del vendedor
  const filteredProductos = useMemo(() => {
    return productos.filter((prod) => {
      const matchText =
        filterQuery.trim() === '' ||
        (prod.nombre && prod.nombre.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (prod.nombre_producto && prod.nombre_producto.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (prod.descripcion && prod.descripcion.toLowerCase().includes(filterQuery.toLowerCase()))

      const matchCat =
        selectedCategory === 'todas' ||
        (prod.categoria && prod.categoria.toLowerCase() === selectedCategory.toLowerCase())

      return matchText && matchCat
    })
  }, [productos, filterQuery, selectedCategory])

  const coverImg = vendedor?.foto_portada?.startsWith('http')
    ? vendedor.foto_portada
    : vendedor?.foto_portada
    ? (vendedor.foto_portada.startsWith('/uploads') ? vendedor.foto_portada : `/uploads/${vendedor.foto_portada}`)
    : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80'

  const avatarImg = vendedor?.avatar?.startsWith('http')
    ? vendedor.avatar
    : vendedor?.avatar
    ? (vendedor.avatar.startsWith('/uploads') ? vendedor.avatar : `/uploads/${vendedor.avatar}`)
    : '/img/Logo.jpg'

  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="app-container">
          {/* Breadcrumbs Navigation */}
          <nav className="vendor-profile-breadcrumbs">
            <Link to="/vendedores" className="vendor-back-link">
              <i className="fa fa-arrow-left" /> Volver al Directorio de Vendedores
            </Link>
          </nav>

          {loading ? (
            <div className="loading-screen">
              <div className="spinner" />
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando perfil del productor campesino...</p>
            </div>
          ) : vendedor ? (
            <>
              {/* Main Vendor Profile Card Header */}
              <div className="card vendor-profile-hero-card fade-in">
                {/* Panoramic Cover Banner */}
                <div className="vendor-profile-cover-wrap">
                  <img
                    src={coverImg}
                    alt={`Portada de ${vendedor.nombre}`}
                    className="vendor-profile-cover-img"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80'
                    }}
                  />
                  <div className="vendor-profile-cover-overlay" />
                </div>

                {/* Profile Header Details */}
                <div className="vendor-profile-hero-body">
                  <div className="vendor-profile-hero-top">
                    {/* Large Avatar */}
                    <div className="vendor-profile-avatar-container">
                      <img
                        src={avatarImg}
                        alt={vendedor.nombre}
                        className="vendor-profile-avatar-img"
                        onError={(e) => { e.target.src = '/img/Logo.jpg' }}
                      />
                    </div>

                    {/* Quick Action Buttons (Contact / Share) */}
                    <div className="vendor-profile-header-actions">
                      {vendedor.telefono && (
                        <a
                          href={`https://wa.me/57${vendedor.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${vendedor.nombre}, vi tus productos en De los Montes de María y me gustaría más información.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-success"
                        >
                          <i className="fab fa-whatsapp" /> Contactar al Productor
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Vendor Identity & Bio */}
                  <div className="vendor-profile-info-section">
                    <div className="vendor-profile-title-row">
                      <h2>{vendedor.nombre}</h2>
                      <span className="vendor-profile-badge-pill">
                        <i className="fa fa-shield-alt" /> Productor Certificado
                      </span>
                    </div>

                    <p className="vendor-profile-handle">@{vendedor.apodo}</p>

                    {vendedor.direccion && (
                      <div className="vendor-profile-origin">
                        <i className="fa fa-map-marker-alt text-primary" />
                        <span><strong>Origen:</strong> {vendedor.direccion}</span>
                      </div>
                    )}

                    {vendedor.descripcion && (
                      <div className="vendor-profile-description-box">
                        <p>{vendedor.descripcion}</p>
                      </div>
                    )}

                    {/* Category Tags */}
                    {vendedor.categoria_productos && (
                      <div className="vendor-profile-tags-row">
                        <span className="tags-label">Especialidades:</span>
                        <div className="tags-list">
                          {vendedor.categoria_productos.split(',').map((cat, i) => (
                            <span key={i} className="badge badge-primary">
                              {cat.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Highlights Summary Bar */}
                  <div className="vendor-profile-highlights-bar">
                    <div className="vendor-highlight-item">
                      <i className="fa fa-box-open" />
                      <div>
                        <strong>{productos.length}</strong>
                        <span>Productos Publicados</span>
                      </div>
                    </div>
                    <div className="vendor-highlight-item">
                      <i className="fa fa-seedling" />
                      <div>
                        <strong>100% Campesino</strong>
                        <span>Cosecha y Origen Directo</span>
                      </div>
                    </div>
                    <div className="vendor-highlight-item">
                      <i className="fa fa-truck" />
                      <div>
                        <strong>Despacho Seguro</strong>
                        <span>Montes de María a Colombia</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Products Section */}
              <div className="vendor-products-section" style={{ marginTop: '2.5rem' }}>
                <div className="vendor-products-header">
                  <div>
                    <h3>
                      Catálogo y Cosechas de {vendedor.nombre} ({filteredProductos.length})
                    </h3>
                    <p className="text-muted">
                      Compra productos frescos y suministros directamente de este productor campesino.
                    </p>
                  </div>

                  {/* Product Search & Filter within Vendor */}
                  {productos.length > 0 && (
                    <div className="vendor-prods-filter-wrap">
                      <div className="vendor-prods-search">
                        <i className="fa fa-search" />
                        <input
                          type="text"
                          placeholder="Buscar entre sus productos..."
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          className="form-input form-input-sm"
                        />
                      </div>

                      {availableCategories.length > 2 && (
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="form-select form-select-sm"
                        >
                          {availableCategories.map((c) => (
                            <option key={c} value={c}>
                              {c === 'todas' ? 'Todas las categorías' : c.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Products Grid */}
                {filteredProductos.length > 0 ? (
                  <div className="grid-cards" style={{ marginTop: '1.25rem' }}>
                    {filteredProductos.map((prod) => (
                      <ProductCard key={prod.id_producto || prod.id} producto={prod} />
                    ))}
                  </div>
                ) : productos.length > 0 ? (
                  <div className="card empty-state" style={{ padding: '2.5rem' }}>
                    <i className="fa fa-search empty-state-icon" />
                    <h4>Sin coincidencias</h4>
                    <p>No se encontraron productos que coincidan con tu búsqueda en este vendedor.</p>
                    <button
                      onClick={() => { setFilterQuery(''); setSelectedCategory('todas'); }}
                      className="btn btn-secondary"
                      style={{ marginTop: '0.75rem' }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <div className="card empty-state" style={{ padding: '3rem' }}>
                    <i className="fa fa-box-open empty-state-icon" />
                    <h4>Este vendedor no tiene productos activos en este momento</h4>
                    <p>
                      {vendedor.nombre} está preparando su próxima cosecha. ¡Vuelve pronto a consultar sus productos!
                    </p>
                    <Link to="/vendedores" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                      Explorar otros vendedores
                    </Link>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card empty-state" style={{ padding: '3rem' }}>
              <i className="fa fa-user-times empty-state-icon" />
              <h4>Vendedor no encontrado</h4>
              <p>El perfil del productor que buscas no existe o ha sido desactivado.</p>
              <Link to="/vendedores" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Ver Todos los Vendedores
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
