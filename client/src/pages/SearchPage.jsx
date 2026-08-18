import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import { buscarProductos } from '../api/productos.api'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!query) {
      setProductos([])
      setLoading(false)
      return
    }

    setLoading(true)
    buscarProductos(query)
      .then((res) => {
        setProductos(res.data?.productos || res.data || [])
      })
      .catch((err) => {
        console.error('Error al buscar productos:', err)
        setProductos([])
      })
      .finally(() => setLoading(false))
  }, [query])

  return (
    <>
      <Navbar />

      <main className="main-content-wrap">
        {/* Breadcrumb */}
        <div className="page-breadcrumb-bar">
          <div className="app-container">
            <nav className="page-breadcrumb">
              <Link to="/">Inicio</Link>
              <span className="breadcrumb-sep">/</span>
              <strong>Búsqueda</strong>
            </nav>
          </div>
        </div>

        <div className="app-container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
          <div className="search-results-header">
            <h1>
              Resultados para: <span className="search-query-highlight">"{query}"</span>
            </h1>
            {!loading && (
              <p className="catalog-count">
                {productos.length} producto{productos.length !== 1 ? 's' : ''} encontrado{productos.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {loading ? (
            <div className="loading-state-box">
              <div className="spinner" />
              <p>Buscando productos...</p>
            </div>
          ) : productos.length > 0 ? (
            <div className="products-grid-container">
              {productos.map((prod) => (
                <ProductCard key={prod.id_producto} producto={prod} />
              ))}
            </div>
          ) : (
            <div className="empty-catalog-card">
              <i className="fa fa-search empty-catalog-icon" />
              <h3>No se encontraron resultados para "{query}"</h3>
              <p>Intenta con otras palabras clave como "queso", "maíz", "abono" o "semillas".</p>
              <Link to="/" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
                Ver Todos los Productos
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
