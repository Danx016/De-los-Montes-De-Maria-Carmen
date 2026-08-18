import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import MediaRenderer from '../components/MediaRenderer'
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
      bgClass: 'slide-bg-1',
      accentColor: '#22c55e',
      categoryName: 'Cosechas Frescas',
      categoryThumb: '/img/verduras.avif',
      categorySlug: 'cosechas',
      title: 'Cosechas Frescas y Tubérculos Tradicionales',
      subtitle: 'Ñame espino, yuca campesina, plátano hartón y aguacate cultivados directamente en las tierras fértiles de los Montes de María.',
      features: ['Ñame Espino y Criollo', 'Yuca Campesina Fresca', 'Pago 100% Directo al Productor'],
      primaryBtn: { text: 'Ver Cosechas', link: '/categoria/cosechas', icon: 'fa-shopping-basket' },
      secondaryBtn: { text: 'Vender mis Productos', link: '/vendedor', icon: 'fa-store' },
      showcaseImage: '/img/Ñame.avif',
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
      bgClass: 'slide-bg-2',
      accentColor: '#f59e0b',
      categoryName: 'Semillas Certificadas',
      categoryThumb: '/img/Maiz amarillo.jpg',
      categorySlug: 'semillas',
      title: 'Semillas Seleccionadas de Alto Rendimiento',
      subtitle: 'Semillas de maíz amarillo, fríjol rojo, hortalizas y granos con alto porcentaje de germinación para agricultores.',
      features: ['Maíz Amarillo Seleccionado', 'Fríjol Rojo Criollo', 'Alta Germinación'],
      primaryBtn: { text: 'Ver Semillas', link: '/categoria/semillas', icon: 'fa-seedling' },
      secondaryBtn: { text: 'Registrarme Gratis', link: '/registro', icon: 'fa-user-plus' },
      showcaseImage: '/img/Maiz amarillo.jpg',
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
      bgClass: 'slide-bg-3',
      accentColor: '#06b6d4',
      categoryName: 'Lácteos de la Finca',
      categoryThumb: '/img/fondo vaca2.png',
      categorySlug: 'lacteos',
      title: 'Queso Costeño y Lácteos Campesinos',
      subtitle: 'Queso costeño fresco, cuajada y suero tradicional elaborado artesanalmente con leche 100% pura en San Jacinto.',
      features: ['Queso Costeño Fresco', 'Suero Tradicional Costeño', 'Leche Pura de Ordeño'],
      primaryBtn: { text: 'Ver Lácteos', link: '/categoria/lacteos', icon: 'fa-cheese' },
      secondaryBtn: { text: 'Conoce los Productores', link: '/vendedores', icon: 'fa-users' },
      showcaseImage: '/img/fondo vaca2.png',
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
      vendorId: 47
    },
    {
      id: 4,
      bgClass: 'slide-bg-4',
      accentColor: '#0284c7',
      categoryName: 'Herramientas & AgroEquipos',
      categoryThumb: '/img/agro-campo.jpeg',
      categorySlug: 'agro',
      title: 'Herramientas de Campo y Maquinaria Agrícola',
      subtitle: 'Fumigadoras, motobombas, machetes, palas y sistemas de riego para el trabajo diario en la finca.',
      features: ['Fumigadoras y Bombas de Agua', 'Herramientas Manuales', 'Garantía Directa'],
      primaryBtn: { text: 'Ver Herramientas', link: '/categoria/agro', icon: 'fa-wrench' },
      secondaryBtn: { text: 'Explorar Catálogo', link: '/catalogo', icon: 'fa-boxes' },
      showcaseImage: '/img/agro-campo.jpeg',
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
    }
  ], [])

  const slides = useMemo(() => {
    if (dbBanners && dbBanners.length > 0) {
      return dbBanners.map((b, idx) => ({
        id: b.id_banner || idx + 1,
        bgClass: `slide-bg-${(idx % 4) + 1}`,
        accentColor: b.color_acento || '#22c55e',
        categoryName: b.categoria_nombre || 'Cosechas Frescas',
        categoryThumb: b.categoria_thumb || '/img/verduras.avif',
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [slides.length])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  const handleCopyCouponCode = (e, code) => {
    e.preventDefault()
    e.stopPropagation()
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
      toast.success(`¡Cupón "${code}" copiado al portapapeles! Úsalo al pagar para obtener tu descuento.`)
    } else {
      toast.info(`Cupón: ${code}`)
    }
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
        {/* Ofercampo-style Dynamic Multi-Slide Animated Hero */}
        <section className="ofercampo-hero-wrapper">
          {slides.map((slide, idx) => {
            const isActive = idx === currentSlide
            const bgImg = slide.backgroundImage || '/img/montes-de-maria-paisaje.jpg'
            const accent = slide.accentColor || '#22c55e'
            const slideStyle = {
              '--slide-accent': accent,
              background: `linear-gradient(135deg, ${accent}cc 0%, #06140ce6 100%), url('${bgImg}') center/cover no-repeat`,
            }

            return (
              <div
                key={slide.id}
                className={`ofercampo-hero-slide ${isActive ? 'active' : ''}`}
                style={slideStyle}
              >
                <div className="ofercampo-hero-grid">
                  {/* Left Column */}
                  <div className="ofercampo-hero-left">
                    <Link to={`/categoria/${slide.categorySlug}`} className="ofercampo-badge">
                      <img
                        src={slide.categoryThumb}
                        alt={slide.categoryName}
                        className="ofercampo-badge-thumb"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      <span className="ofercampo-badge-title">{slide.categoryName}</span>
                    </Link>

                    <h1 className="ofercampo-title">{slide.title}</h1>

                    <p className="ofercampo-subtitle">{slide.subtitle}</p>

                    <div className="ofercampo-features">
                      {slide.features.map((feat, fIdx) => (
                        <span key={fIdx} className="ofercampo-feature-item">
                          <i className="fa fa-check-circle" /> {feat}
                        </span>
                      ))}
                    </div>

                    <div className="ofercampo-actions">
                      {slide.primaryBtn.link.startsWith('#') ? (
                        <a href={slide.primaryBtn.link} className="btn-ofercampo-primary">
                          <i className={`fa ${slide.primaryBtn.icon}`} /> {slide.primaryBtn.text}
                        </a>
                      ) : (
                        <Link to={slide.primaryBtn.link} className="btn-ofercampo-primary">
                          <i className={`fa ${slide.primaryBtn.icon}`} /> {slide.primaryBtn.text}
                        </Link>
                      )}

                      <Link to={slide.secondaryBtn.link} className="btn-ofercampo-secondary">
                        <i className={`fa ${slide.secondaryBtn.icon}`} /> {slide.secondaryBtn.text}
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Visual Showcase Card */}
                  <div className="ofercampo-hero-right">
                    <div className="ofercampo-visual-card">
                      <div className="ofercampo-product-preview-box">
                        <img
                          src={slide.showcaseImage}
                          alt={slide.showcaseTitle}
                          onError={(e) => {
                            e.currentTarget.src = 'https://carnesoasis.com/wp-content/uploads/2020/09/Queso-fresco.jpg'
                          }}
                        />
                      </div>

                      <div className="ofercampo-card-details">
                        <div className="ofercampo-card-title-row">
                          <h4 className="ofercampo-card-title">
                            {slide.showcaseTitle}
                          </h4>
                          <span className="ofercampo-card-price">
                            {slide.showcasePrice}
                          </span>
                        </div>

                        {/* Real Vendor Link */}
                        <Link
                          to={`/vendedor/${slide.vendorId}`}
                          className="ofercampo-card-vendor"
                        >
                          <i className="fa fa-user-check" style={{ color: '#4ade80' }} />
                          <span>Vendido por {slide.farmerName} • {slide.floatPillBottom}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
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
                onClick={() => setCurrentSlide(dotIdx)}
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
