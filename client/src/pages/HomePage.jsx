import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import MediaRenderer from '../components/MediaRenderer'
import HeroSlideRenderer from '../components/HeroSlideRenderer'
import { listarProductos, listarCategoriasPublicas } from '../api/productos.api'
import { listarBannersPublicos } from '../api/banners.api'
import { useToast } from '../context/ToastContext'

export default function HomePage() {
  const toast = useToast()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [dbBanners, setDbBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('all')
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      listarProductos().catch(() => ({ data: [] })),
      listarCategoriasPublicas().catch(() => ({ data: [] })),
      listarBannersPublicos().catch(() => ({ data: { banners: [] } }))
    ])
      .then(([prodRes, catRes, banRes]) => {
        const rawProds = prodRes.data?.productos || prodRes.data || []
        setProductos(rawProds)
        const rawCats = catRes.data || []
        setCategorias(rawCats)
        const rawBanners = banRes.data?.banners || []
        if (rawBanners.length > 0) {
          setDbBanners(rawBanners)
        }
      })
      .catch((err) => {
        console.error('Error al cargar datos en HomePage:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  const DEFAULT_SLIDES = useMemo(() => [
    {
      id: 1,
      estilo_plantilla: 'clasico',
      filtro_blur: 0,
      bgClass: 'slide-bg-1',
      backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      accentColor: '#22c55e',
      categoryName: 'Cosechas Frescas',
      categoryThumb: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      categorySlug: 'cosechas',
      title: 'Cosechas Frescas y Tubérculos Tradicionales',
      subtitle: 'Ñame espino, yuca campesina, plátano hartón y aguacate cultivados directamente en las tierras fértiles de los Montes de María.',
      features: ['Ñame Espino y Criollo', 'Yuca Campesina Fresca', 'Pago 100% Directo al Productor'],
      primaryBtn: { text: 'Ver Cosechas', link: '/categoria/cosechas', icon: 'fa-shopping-basket' },
      secondaryBtn: { text: 'Vender mis Productos', link: '/vendedor', icon: 'fa-store' },
      showcaseImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
      showcaseOrigin: '🇨🇴 San Juan Nepomuceno, Bolívar',
      showcasePrice: '$6.000 COP / Kilo',
      farmerAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80',
      farmerName: 'Roberto Carlos Salcedo',
      farmerLocation: 'Productor Verificado • Montes de María',
      showcaseTitle: 'Ñame Criollo Espino',
      showcaseDesc: 'Ñame espino de primera calidad, cosechado tradicionalmente.',
      targetCategory: '/categoria/cosechas',
      floatPillTop: '🌿 100% Campo',
      floatPillBottom: '⭐ 4.9/5 Calidad',
      vendorId: 47
    },
    {
      id: 2,
      estilo_plantilla: 'inmersivo',
      filtro_blur: 2,
      bgClass: 'slide-bg-2',
      backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      accentColor: '#f59e0b',
      categoryName: 'Semillas Certificadas',
      categoryThumb: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
      categorySlug: 'semillas',
      title: 'Semillas Seleccionadas de Alto Rendimiento',
      subtitle: 'Semillas de maíz amarillo, fríjol rojo, hortalizas y granos con alto porcentaje de germinación para agricultores.',
      features: ['Maíz Amarillo Seleccionado', 'Fríjol Rojo Criollo', 'Alta Germinación'],
      primaryBtn: { text: 'Ver Semillas', link: '/categoria/semillas', icon: 'fa-seedling' },
      secondaryBtn: { text: 'Registrarme Gratis', link: '/registro', icon: 'fa-user-plus' },
      showcaseImage: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
      showcaseOrigin: '🇨🇴 El Carmen de Bolívar',
      showcasePrice: '$8.000 COP / Libra',
      farmerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      farmerName: 'Roberto Carlos Salcedo',
      farmerLocation: 'Vereda La Esperanza • Bolívar',
      showcaseTitle: 'Semilla de Maíz Amarillo',
      showcaseDesc: 'Ideal para siembra tradicional y alto rendimiento por hectárea.',
      targetCategory: '/categoria/semillas',
      floatPillTop: '🌱 Alta Germinación',
      floatPillBottom: '📦 Disponible en Stock',
      vendorId: 47
    },
    {
      id: 3,
      estilo_plantilla: 'oferta_flash',
      filtro_blur: 0,
      bgClass: 'slide-bg-3',
      backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      accentColor: '#ea580c',
      categoryName: 'Lácteos de la Finca',
      categoryThumb: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
      categorySlug: 'lacteos',
      title: 'Queso Costeño Artesanal y Lácteos del Campo',
      subtitle: 'Queso fresco, cuajada y suero tradicional elaborado artesanalmente con leche 100% pura de ordeño.',
      features: ['Queso Costeño Fresco', 'Suero Tradicional Costeño', 'Leche Pura de Ordeño'],
      primaryBtn: { text: '¡Aprovechar Descuento!', link: '/categoria/lacteos', icon: 'fa-bolt' },
      secondaryBtn: { text: 'Conoce Productores', link: '/vendedores', icon: 'fa-users' },
      showcaseImage: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
      showcaseOrigin: '🇨🇴 San Jacinto, Bolívar',
      showcasePrice: '$15.000 COP / Libra',
      farmerAvatar: 'https://lh3.googleusercontent.com/a/ACg8ocKtW4pze1TE1348PFd51tCxtkICjJQA7n-a0vdEAYNZCmVDqg=s96-c',
      farmerName: 'Roberto Carlos Salcedo',
      farmerLocation: 'Finca Ganadera • San Jacinto',
      showcaseTitle: 'Queso Costeño Fresco',
      showcaseDesc: 'Queso artesanal fresco elaborado con leche pura de vaca.',
      targetCategory: '/categoria/lacteos',
      floatPillTop: '🧀 100% Artesanal',
      floatPillBottom: '🚚 Envío Inmediato',
      cupon_codigo: 'QUESO15',
      cupon_texto: '⚡ ¡Usa el cupón QUESO15 y obtén 15% OFF en lácteos artesanales!',
      vendorId: 47
    },
    {
      id: 4,
      estilo_plantilla: 'mosaico',
      filtro_blur: 0,
      bgClass: 'slide-bg-4',
      backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      accentColor: '#0284c7',
      categoryName: 'Herramientas & AgroEquipos',
      categoryThumb: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      categorySlug: 'agro',
      title: 'Herramientas de Campo y Maquinaria Agrícola',
      subtitle: 'Fumigadoras, motobombas, machetes, palas y sistemas de riego para el trabajo diario en la finca.',
      features: ['Fumigadoras y Bombas de Agua', 'Herramientas Manuales', 'Garantía Directa'],
      primaryBtn: { text: 'Ver Herramientas', link: '/categoria/agro', icon: 'fa-wrench' },
      secondaryBtn: { text: 'Explorar Catálogo', link: '/catalogo', icon: 'fa-boxes' },
      showcaseImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      showcaseOrigin: '🇨🇴 Montes de María',
      showcasePrice: '$250.000 COP',
      farmerAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80',
      farmerName: 'Roberto Carlos Salcedo',
      farmerLocation: 'Distribución Montes de María',
      showcaseTitle: 'Fumigadora Manual RoyalCondor',
      showcaseDesc: 'Fumigadora clásica resistente para cultivos de la región.',
      targetCategory: '/categoria/agro',
      floatPillTop: '🚜 Trabajo Pesado',
      floatPillBottom: '🛡️ Garantía de Campo',
      vendorId: 47
    },
    {
      id: 5,
      estilo_plantilla: 'historia_campesina',
      filtro_blur: 0,
      bgClass: 'slide-bg-1',
      backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      accentColor: '#15803d',
      categoryName: 'Tradición Campesina',
      categoryThumb: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      categorySlug: 'cosechas',
      title: 'Raíces y Tradición de los Montes de María',
      subtitle: 'Cada fruto que sembramos lleva el sudor, la esperanza y la memoria de nuestras familias montemarianas.',
      features: ['Comercio Justo y Solidario', 'Productores Verificados', 'Apoyo Directo a la Paz y el Campo'],
      primaryBtn: { text: 'Apoyar al Productor', link: '/vendedores', icon: 'fa-heart' },
      secondaryBtn: { text: 'Ver Todas las Fincas', link: '/catalogo', icon: 'fa-store' },
      showcaseImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
      showcaseOrigin: '🇨🇴 San Jacinto & El Carmen de Bolívar',
      showcasePrice: '$6.000 COP / Kilo',
      farmerAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80',
      farmerName: 'Roberto Carlos Salcedo',
      farmerLocation: 'Productor de Montes de María',
      showcaseTitle: 'Cosechas Agroecológicas',
      showcaseDesc: 'Cultivos tradicionales de los Montes de María.',
      targetCategory: '/categoria/cosechas',
      floatPillTop: '🌾 Herencia Campesina',
      floatPillBottom: '⭐ 5.0 Productor',
      vendorId: 47
    }
  ], [])

  const slides = useMemo(() => {
    if (dbBanners && dbBanners.length > 0) {
      return dbBanners.map((b, idx) => ({
        id: b.id_banner || idx + 1,
        estilo_plantilla: b.estilo_plantilla || 'clasico',
        filtro_blur: b.filtro_blur !== undefined ? b.filtro_blur : 0,
        bgClass: `slide-bg-${(idx % 4) + 1}`,
        accentColor: b.color_acento || '#22c55e',
        categoryName: b.categoria_nombre || 'Cosechas Frescas',
        categoryThumb: b.categoria_thumb || '/img/Logo.jpg',
        categorySlug: b.categoria_slug || 'cosechas',
        title: b.titulo,
        subtitle: b.subtitulo,
        features: Array.isArray(b.features) ? b.features : [],
        primaryBtn: {
          text: b.boton_principal_texto || 'Ver Catálogo',
          link: b.boton_principal_link || '/catalogo',
          icon: 'fa-shopping-basket'
        },
        secondaryBtn: {
          text: b.boton_secundario_texto || 'Vender mis Productos',
          link: b.boton_secundario_link || '/vendedor',
          icon: 'fa-store'
        },
        showcaseImage: b.tarjeta_imagen || '/img/Ñame.avif',
        showcaseOrigin: '🇨🇴 Montes de María',
        showcasePrice: b.tarjeta_precio || '$6.000 COP',
        farmerAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80',
        farmerName: b.tarjeta_vendedor_nombre || 'Roberto Carlos Salcedo',
        farmerLocation: 'Productor Verificado • Montes de María',
        showcaseTitle: b.tarjeta_titulo || b.titulo,
        showcaseDesc: b.subtitulo,
        targetCategory: `/categoria/${b.categoria_slug || 'cosechas'}`,
        backgroundImage: b.imagen_fondo,
        floatPillTop: b.tarjeta_badge_top || '🌿 100% Campo',
        floatPillBottom: b.tarjeta_vendedor_rating || '⭐ 4.9/5 Calidad',
        vendorId: b.tarjeta_vendedor_id || 47,
        cupon_codigo: b.cupon_codigo || '',
        cupon_texto: b.cupon_texto || '',
      }))
    }
    return DEFAULT_SLIDES
  }, [dbBanners, DEFAULT_SLIDES])

  const [isHovered, setIsHovered] = useState(false)
  const SLIDE_DURATION = 7500 // 7.5 segundos completos por slide

  useEffect(() => {
    if (isHovered || slides.length <= 1) return

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, SLIDE_DURATION)

    return () => clearTimeout(timer)
  }, [currentSlide, isHovered, slides.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (idx) => {
    setCurrentSlide(idx)
  }

  const filteredProducts = selectedCat === 'all'
    ? productos
    : productos.filter((p) => {
        const catSlug = selectedCat.toLowerCase()
        const pCat = (p.categoria || '').toLowerCase()
        return pCat === catSlug || (p.nombre_categoria && p.nombre_categoria.toLowerCase() === catSlug)
      })

  return (
    <>
      <Navbar />

      <main className="main-content-wrap">
        {/* Dynamic Multi-Style Hero Carousel */}
        <section
          className="ofercampo-hero-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Top Progress Timer Bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              zIndex: 20,
              overflow: 'hidden',
            }}
          >
            <div
              key={currentSlide}
              style={{
                height: '100%',
                backgroundColor: slides[currentSlide]?.accentColor || '#22c55e',
                animation: isHovered ? 'none' : `slideTimerProgress ${SLIDE_DURATION}ms linear forwards`,
                boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)',
              }}
            />
          </div>

          {slides.map((slide, idx) => {
            const isActive = idx === currentSlide

            return (
              <div
                key={slide.id}
                className={`ofercampo-hero-slide ${isActive ? 'active' : ''}`}
                style={{ padding: 0 }}
              >
                <HeroSlideRenderer slide={slide} isPreview={false} />
              </div>
            )
          })}

          {/* Slider Prev / Next Arrows */}
          <button
            type="button"
            className="ofercampo-slider-btn ofercampo-slider-prev"
            onClick={prevSlide}
            aria-label="Diapositiva anterior"
          >
            <i className="fa fa-chevron-left" />
          </button>
          <button
            type="button"
            className="ofercampo-slider-btn ofercampo-slider-next"
            onClick={nextSlide}
            aria-label="Siguiente diapositiva"
          >
            <i className="fa fa-chevron-right" />
          </button>

          {/* Dots Indicator */}
          <div className="ofercampo-dots-container">
            {slides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                className={`ofercampo-dot ${dotIdx === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(dotIdx)}
                aria-label={`Ir a diapositiva ${dotIdx + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Categories Grid Section */}
        <section className="categories-block app-container">
          <div className="block-header">
            <h2 className="block-title">Explora por Categorías</h2>
            <p className="block-subtitle">Encuentra insumos y cosechas seleccionadas con el mejor estándar de calidad.</p>
          </div>

          <div className="categories-cards-grid">
            {categorias.map((cat) => {
              const slug = cat.slug || cat.nombre_categoria?.toLowerCase().replace(/\s+/g, '-')
              const color = cat.color || '#2e7d32'

              return (
                <Link to={`/categoria/${slug}`} key={cat.id_categoria || slug} className="category-item-card">
                  <div
                    className="cat-icon-circle"
                    style={{
                      backgroundColor: `${color}15`,
                      color: color,
                      overflow: 'hidden',
                      padding: '4px',
                    }}
                  >
                    <MediaRenderer
                      src={cat.imagen}
                      alt={cat.nombre_categoria}
                      icon={cat.icono || 'fa-box'}
                      color={color}
                      type="category"
                    />
                  </div>
                  <h3 className="cat-item-title">{cat.nombre_categoria}</h3>
                  <p className="cat-item-desc">{cat.descripcion || 'Explora productos de esta categoría'}</p>
                  <span className="cat-item-link">Ver catálogo <i className="fa fa-chevron-right" /></span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Main Products Catalog */}
        <section id="catalogo" className="catalog-block app-container">
          <div className="catalog-top-bar">
            <div>
              <h2 className="block-title">Productos Destacados</h2>
              <p className="block-subtitle">Directamente cosechados y empacados en la región.</p>
            </div>

            {/* Filter Pills */}
            <div className="catalog-filter-tabs">
              <button
                className={`catalog-tab-btn ${selectedCat === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCat('all')}
              >
                Todos ({productos.length})
              </button>
              {categorias.map((cat) => {
                const slug = cat.slug || cat.nombre_categoria?.toLowerCase().replace(/\s+/g, '-')
                return (
                  <button
                    key={cat.id_categoria || slug}
                    className={`catalog-tab-btn ${selectedCat === slug ? 'active' : ''}`}
                    onClick={() => setSelectedCat(slug)}
                  >
                    {cat.nombre_categoria}
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? (
            <div className="loading-state-box">
              <div className="spinner" />
              <p>Cargando productos del campo...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="products-grid-container">
              {filteredProducts.map((prod) => (
                <ProductCard key={prod.id_producto} producto={prod} />
              ))}
            </div>
          ) : (
            <div className="empty-catalog-card">
              <i className="fa fa-seedling empty-catalog-icon" />
              <h3>No hay productos en esta categoría por el momento</h3>
              <p>Nuestros productores están alistando el próximo despacho.</p>
              <button onClick={() => setSelectedCat('all')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Ver Todos los Productos
              </button>
            </div>
          )}
        </section>

        {/* Value Proposition Strip */}
        <section className="benefits-section app-container">
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon-box"><i className="fa fa-truck-fast" /></div>
              <div className="benefit-text">
                <h4>Envíos Directos</h4>
                <p>Despachos garantizados desde la finca hasta tu puerta.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-box"><i className="fa fa-shield-alt" /></div>
              <div className="benefit-text">
                <h4>Pagos 100% Protegidos</h4>
                <p>Paga con Contra Entrega, Wompi o ePayco con total tranquilidad.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-box"><i className="fa fa-headset" /></div>
              <div className="benefit-text">
                <h4>Soporte & Asistente IA</h4>
                <p>Asesoría en línea y respuesta inmediata a tus consultas.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
