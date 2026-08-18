import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { listarVendedores } from '../api/usuario.api'
import { getAvatarUrl, handleAvatarError } from '../utils/avatar'

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const navigate = useNavigate()

  useEffect(() => {
    listarVendedores()
      .then((res) => {
        setVendedores(res.data || [])
      })
      .catch((err) => console.error('Error al cargar vendedores:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleVerPerfil = (id) => {
    navigate(`/vendedor/${id}`)
  }

  // Filtrado reactivo de vendedores
  const filteredVendedores = useMemo(() => {
    return vendedores.filter((v) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        (v.nombre && v.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.apodo && v.apodo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.descripcion && v.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.direccion && v.direccion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.categoria_productos && v.categoria_productos.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchCategory =
        selectedCategory === 'todas' ||
        (v.categoria_productos && v.categoria_productos.toLowerCase().includes(selectedCategory.toLowerCase()))

      return matchSearch && matchCategory
    })
  }, [vendedores, searchTerm, selectedCategory])

  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="app-container">
          {/* Header Banner Compacto */}
          <div className="vendors-hero-banner fade-in">
            <div className="vendors-hero-top">
              <div className="vendors-hero-info">
                <span className="badge badge-success">
                  <i className="fa fa-leaf" /> Productores Locales
                </span>
                <h1>Vendedores y Familias Campesinas</h1>
                <p>
                  Comercio justo sin intermediarios, directamente de los Montes de María a tu hogar.
                </p>
              </div>

              {/* Search input compacto alineado */}
              <div className="vendors-search-input-wrap">
                <i className="fa fa-search" />
                <input
                  type="text"
                  placeholder="Buscar productor, municipio o cultivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="vendors-search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="vendors-search-clear"
                    title="Limpiar búsqueda"
                  >
                    <i className="fa fa-times" />
                  </button>
                )}
              </div>
            </div>

            {/* Categorías en fila deslizable compacta */}
            <div className="vendors-filter-pills">
              <button
                className={`vendor-pill-btn ${selectedCategory === 'todas' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('todas')}
              >
                Todos ({vendedores.length})
              </button>
              <button
                className={`vendor-pill-btn ${selectedCategory === 'cosechas' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('cosechas')}
              >
                🌾 Cosechas
              </button>
              <button
                className={`vendor-pill-btn ${selectedCategory === 'lacteos' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('lacteos')}
              >
                🧀 Lácteos
              </button>
              <button
                className={`vendor-pill-btn ${selectedCategory === 'tuberculos' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('tuberculos')}
              >
                🥔 Tubérculos
              </button>
              <button
                className={`vendor-pill-btn ${selectedCategory === 'frutas' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('frutas')}
              >
                🥭 Frutas
              </button>
              <button
                className={`vendor-pill-btn ${selectedCategory === 'semillas' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('semillas')}
              >
                🌱 Semillas
              </button>
              <button
                className={`vendor-pill-btn ${selectedCategory === 'abonos' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('abonos')}
              >
                🍃 Abonos
              </button>
            </div>
          </div>

          {/* Vendors Grid */}
          {loading ? (
            <div className="loading-screen">
              <div className="spinner" />
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando productores del campo...</p>
            </div>
          ) : filteredVendedores.length > 0 ? (
            <div className="vendors-rich-grid">
              {filteredVendedores.map((vendedor) => {
                const coverImg = vendedor.foto_portada?.startsWith('http')
                  ? vendedor.foto_portada
                  : vendedor.foto_portada
                  ? (vendedor.foto_portada.startsWith('/uploads') ? vendedor.foto_portada : `/uploads/${vendedor.foto_portada}`)
                  : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'

                const avatarImg = getAvatarUrl(vendedor)

                return (
                  <div key={vendedor.id || vendedor.id_usuario} className="card rich-vendor-card fade-in">
                    {/* Top Cover Banner */}
                    <div className="rich-vendor-cover">
                      <img
                        src={coverImg}
                        alt={`Portada de ${vendedor.nombre}`}
                        className="rich-vendor-cover-img"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'
                        }}
                      />
                      <div className="rich-vendor-cover-gradient" />
                      <span className="rich-vendor-verified-badge">
                        <i className="fa fa-check-circle" /> Verificado
                      </span>
                    </div>

                    {/* Avatar & Info */}
                    <div className="rich-vendor-body">
                      <div className="rich-vendor-avatar-wrap">
                        <img
                          src={avatarImg}
                          alt={vendedor.nombre}
                          className="rich-vendor-avatar"
                          onError={(e) => handleAvatarError(e, vendedor.nombre)}
                        />
                      </div>

                      <div className="rich-vendor-meta">
                        <h3 className="rich-vendor-title">{vendedor.nombre}</h3>
                        <span className="rich-vendor-handle">@{vendedor.apodo}</span>

                        {vendedor.direccion && (
                          <div className="rich-vendor-location">
                            <i className="fa fa-map-marker-alt" /> {vendedor.direccion}
                          </div>
                        )}
                      </div>

                      {vendedor.descripcion && (
                        <p className="rich-vendor-bio">
                          {vendedor.descripcion.length > 110
                            ? `${vendedor.descripcion.substring(0, 110)}...`
                            : vendedor.descripcion}
                        </p>
                      )}

                      {vendedor.categoria_productos && (
                        <div className="rich-vendor-categories">
                          {vendedor.categoria_productos.split(',').map((cat, idx) => (
                            <span key={idx} className="rich-vendor-category-tag">
                              {cat.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="rich-vendor-actions">
                        <button
                          onClick={() => handleVerPerfil(vendedor.id || vendedor.id_usuario)}
                          className="btn btn-primary btn-block rich-vendor-btn"
                        >
                          <i className="fa fa-store" /> Ver Perfil y Productos
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card empty-state" style={{ padding: '3rem 1.5rem', marginTop: '1.5rem' }}>
              <i className="fa fa-users-slash empty-state-icon" />
              <h4>No se encontraron vendedores</h4>
              <p>
                {searchTerm || selectedCategory !== 'todas'
                  ? 'No hay productores que coincidan con tu búsqueda. Intenta con otros términos o filtros.'
                  : 'Aún no hay vendedores registrados en la plataforma.'}
              </p>
              {(searchTerm || selectedCategory !== 'todas') && (
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory('todas'); }}
                  className="btn btn-secondary"
                  style={{ marginTop: '1rem' }}
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}