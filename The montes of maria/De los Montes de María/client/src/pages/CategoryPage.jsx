import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import MediaRenderer from '../components/MediaRenderer'
import { listarProductos, listarCategoriasPublicas } from '../api/productos.api'

export default function CategoryPage() {
  const { slug } = useParams()
  const [productos, setProductos] = useState([])
  const [categoriaInfo, setCategoriaInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      listarProductos().catch(() => ({ data: [] })),
      listarCategoriasPublicas().catch(() => ({ data: [] }))
    ])
      .then(([prodRes, catRes]) => {
        const todos = prodRes.data?.productos || prodRes.data || []
        const filtrados = todos.filter(
          (p) => (p.categoria || '').toLowerCase() === (slug || '').toLowerCase()
        )
        setProductos(filtrados)

        const rawCats = catRes.data || []
        const found = rawCats.find(
          (c) => (c.slug || '').toLowerCase() === (slug || '').toLowerCase() ||
                 (c.nombre_categoria || '').toLowerCase().replace(/\s+/g, '-') === (slug || '').toLowerCase()
        )

        if (found) {
          setCategoriaInfo({
            titulo: found.nombre_categoria,
            descripcion: found.descripcion || 'Explora los productos de esta categoría.',
            icon: found.icono || 'fa-box',
            color: found.color || '#2e7d32',
            imagen: found.imagen || null
          })
        } else {
          setCategoriaInfo({
            titulo: slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Categoría',
            descripcion: 'Explora los productos disponibles en esta sección.',
            icon: 'fa-box',
            color: '#2e7d32',
            imagen: null
          })
        }
      })
      .catch((err) => console.error('Error al cargar categoría:', err))
      .finally(() => setLoading(false))
  }, [slug])

  const catInfo = categoriaInfo || {
    titulo: slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Categoría',
    descripcion: 'Explora los productos disponibles en esta sección.',
    icon: 'fa-box',
    color: '#2e7d32',
  }

  return (
    <>
      <Navbar />

      <main className="main-content-wrap">
        {/* Page Breadcrumb */}
        <div className="page-breadcrumb-bar">
          <div className="app-container">
            <nav className="page-breadcrumb">
              <Link to="/">Inicio</Link>
              <span className="breadcrumb-sep">/</span>
              <strong>{catInfo.titulo}</strong>
            </nav>
          </div>
        </div>

        <div className="app-container" style={{ paddingTop: '1.75rem', paddingBottom: '4rem' }}>
          {/* Category Hero Banner Rediseñado & Elegante */}
          <div
            className="cat-hero-card fade-in"
            style={{
              '--hero-accent': catInfo.color || '#2e7d32',
              '--hero-accent-subtle': `${catInfo.color || '#2e7d32'}18`,
              '--hero-accent-border': `${catInfo.color || '#2e7d32'}35`,
            }}
          >
            <div className="cat-hero-glow" />

            <div className="cat-hero-content">
              <div className="cat-hero-tag-row">
                <span className="cat-hero-tag">
                  <i className="fa fa-leaf" /> Mercado Campesino • Montes de María
                </span>
                <span className="badge badge-outline" style={{ borderColor: `${catInfo.color || '#2e7d32'}40`, color: catInfo.color || '#2e7d32', fontSize: '0.78rem' }}>
                  Categoría Oficial
                </span>
              </div>

              <h1 className="cat-hero-title">{catInfo.titulo}</h1>
              <p className="cat-hero-desc">
                {catInfo.descripcion || 'Explora los mejores productos locales directamente traídos desde el campo de los Montes de María.'}
              </p>

              <div className="cat-hero-badges-row">
                <div className="cat-hero-badge-pill">
                  <i className="fa fa-boxes-stacked" />
                  <span><strong>{productos.length}</strong> {productos.length === 1 ? 'Producto disponible' : 'Productos disponibles'}</span>
                </div>
                <div className="cat-hero-badge-pill">
                  <i className="fa fa-truck-fast" />
                  <span>Envíos directos sin intermediarios</span>
                </div>
                <div className="cat-hero-badge-pill">
                  <i className="fa fa-award" />
                  <span>Calidad 100% Garantizada</span>
                </div>
              </div>
            </div>

            <div className="cat-hero-showcase">
              <MediaRenderer
                src={catInfo.imagen}
                alt={catInfo.titulo}
                icon={catInfo.icon || 'fa-box'}
                color={catInfo.color || '#2e7d32'}
                type="category"
              />
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="loading-state-box">
              <div className="spinner" />
              <p>Cargando productos...</p>
            </div>
          ) : productos.length > 0 ? (
            <>
              <p className="catalog-count">{productos.length} productos disponibles</p>
              <div className="products-grid-container">
                {productos.map((prod) => (
                  <ProductCard key={prod.id_producto} producto={prod} />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-catalog-card">
              <i className="fa fa-seedling empty-catalog-icon" />
              <h3>No hay productos en {catInfo.titulo}</h3>
              <p>Nuestros agricultores están alistando la próxima cosecha.</p>
              <Link to="/" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
                Volver al Catálogo Principal
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
