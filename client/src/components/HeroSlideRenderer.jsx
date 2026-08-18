import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'

/**
 * HeroSlideRenderer
 * Renderiza diapositivas del carrusel con 5 estilos visuales distintos:
 * - 'clasico': Split Hero con tarjeta de producto flotante glassmorphism.
 * - 'inmersivo': Hero centrado minimalista de gran impacto visual y tipografía destacada.
 * - 'oferta_flash': Enfoque promocional con caja de cupón interactiva y cinta de descuento.
 * - 'mosaico': Presentación con 3 tarjetas de pilares/características del campo.
 * - 'historia_campesina': Enfoque en el campesino productor, testimonio y origen local.
 */
export default function HeroSlideRenderer({ slide, isPreview = false }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const estilo = slide.estilo_plantilla || 'clasico'
  const accent = slide.accentColor || slide.color_acento || '#22c55e'
  const blurVal = slide.filtro_blur !== undefined ? Number(slide.filtro_blur) : 0
  const bgImg = slide.backgroundImage || slide.imagen_fondo || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80'

  const handleCopyCoupon = (e, code) => {
    e.preventDefault()
    e.stopPropagation()
    if (!code) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      if (toast && toast.success) {
        toast.success(`¡Cupón "${code}" copiado al portapapeles!`)
      }
    } else if (toast && toast.info) {
      toast.info(`Código de cupón: ${code}`)
    }
  }

  // Helper para renderizar botones seguros (Link o div/a si es preview)
  const renderPrimaryBtn = (extraClass = '', customText = null, customIcon = null) => {
    const text = customText || slide.primaryBtn?.text || slide.boton_principal_texto || 'Ver Catálogo'
    const link = slide.primaryBtn?.link || slide.boton_principal_link || '/catalogo'
    const icon = customIcon || slide.primaryBtn?.icon || 'fa-shopping-basket'

    if (isPreview) {
      return (
        <span
          className={`btn-ofercampo-primary ${extraClass}`}
          style={{ backgroundColor: accent, borderColor: accent }}
        >
          <i className={`fa ${icon}`} /> {text}
        </span>
      )
    }

    if (link.startsWith('#') || link.startsWith('http')) {
      return (
        <a
          href={link}
          className={`btn-ofercampo-primary ${extraClass}`}
          style={{ backgroundColor: accent, borderColor: accent }}
        >
          <i className={`fa ${icon}`} /> {text}
        </a>
      )
    }

    return (
      <Link
        to={link}
        className={`btn-ofercampo-primary ${extraClass}`}
        style={{ backgroundColor: accent, borderColor: accent }}
      >
        <i className={`fa ${icon}`} /> {text}
      </Link>
    )
  }

  const renderSecondaryBtn = (extraClass = '', customText = null, customIcon = null) => {
    const text = customText || slide.secondaryBtn?.text || slide.boton_secundario_texto || 'Vender mis Productos'
    const link = slide.secondaryBtn?.link || slide.boton_secundario_link || '/vendedor'
    const icon = customIcon || slide.secondaryBtn?.icon || 'fa-store'

    if (isPreview) {
      return (
        <span className={`btn-ofercampo-secondary ${extraClass}`}>
          <i className={`fa ${icon}`} /> {text}
        </span>
      )
    }

    if (link.startsWith('#') || link.startsWith('http')) {
      return (
        <a href={link} className={`btn-ofercampo-secondary ${extraClass}`}>
          <i className={`fa ${icon}`} /> {text}
        </a>
      )
    }

    return (
      <Link to={link} className={`btn-ofercampo-secondary ${extraClass}`}>
        <i className={`fa ${icon}`} /> {text}
      </Link>
    )
  }

  const features = Array.isArray(slide.features)
    ? slide.features
    : typeof slide.features === 'string'
    ? slide.features.split('\n').map((f) => f.trim()).filter(Boolean)
    : []

  const catThumb = slide.categoryThumb || slide.categoria_thumb || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
  const catName = slide.categoryName || slide.categoria_nombre || 'Cosechas Frescas'
  const catSlug = slide.categorySlug || slide.categoria_slug || 'cosechas'

  const prodImg = slide.showcaseImage || slide.tarjeta_imagen || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'
  const prodTitle = slide.showcaseTitle !== undefined ? slide.showcaseTitle : (slide.tarjeta_titulo !== undefined ? slide.tarjeta_titulo : (slide.title || slide.titulo || ''))
  const prodPrice = slide.showcasePrice !== undefined ? slide.showcasePrice : (slide.tarjeta_precio !== undefined ? slide.tarjeta_precio : '')
  const vendorName = slide.farmerName !== undefined ? slide.farmerName : (slide.tarjeta_vendedor_nombre !== undefined ? slide.tarjeta_vendedor_nombre : '')
  const vendorRating = slide.floatPillBottom !== undefined ? slide.floatPillBottom : (slide.tarjeta_vendedor_rating !== undefined ? slide.tarjeta_vendedor_rating : '')
  const badgeTop = slide.floatPillTop !== undefined ? slide.floatPillTop : (slide.tarjeta_badge_top !== undefined ? slide.tarjeta_badge_top : '')
  const vendorId = slide.vendorId || slide.tarjeta_vendedor_id || 47
  const cuponCod = slide.cupon_codigo || ''
  const cuponTxt = slide.cupon_texto || ''

  return (
    <div
      className={`hero-slide-container template-${estilo}`}
      style={{
        '--slide-accent': accent,
        position: 'relative',
        width: '100%',
        minHeight: isPreview ? '380px' : 'auto',
        overflow: 'hidden',
        color: '#ffffff',
        display: 'flex',
        alignItems: isPreview ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isPreview ? '1rem 0.85rem' : '2.5rem 1.5rem',
      }}
    >
      {/* Capa de Fondo con Imagen y Desenfoque Dinámico */}
      <div
        className="hero-bg-layer"
        style={{
          position: 'absolute',
          top: '-15px',
          left: '-15px',
          right: '-15px',
          bottom: '-15px',
          backgroundImage: `url('${bgImg}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: blurVal > 0 ? `blur(${blurVal}px)` : 'none',
          WebkitFilter: blurVal > 0 ? `blur(${blurVal}px)` : 'none',
          transform: blurVal > 0 ? 'scale(1.12)' : 'scale(1)',
          transformOrigin: 'center center',
          zIndex: 0,
          willChange: 'filter, transform',
          transition: 'filter 0.3s ease, transform 0.3s ease',
        }}
      />

      {/* Capa de Tinte Gradiente Personalizado con Transparencia Balanceada */}
      <div
        className="hero-gradient-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            estilo === 'inmersivo'
              ? `radial-gradient(circle at center, ${accent}88 0%, rgba(3, 16, 8, 0.82) 80%)`
              : estilo === 'oferta_flash'
              ? `linear-gradient(135deg, ${accent}aa 0%, rgba(28, 10, 0, 0.82) 100%)`
              : estilo === 'historia_campesina'
              ? `linear-gradient(135deg, rgba(27, 61, 28, 0.82) 0%, rgba(7, 25, 11, 0.82) 60%, ${accent}88 100%)`
              : `linear-gradient(135deg, ${accent}99 0%, rgba(6, 20, 12, 0.80) 100%)`,
          zIndex: 1,
        }}
      />

      {/* Contenido según el Estilo Seleccionado */}
      <div className="hero-inner-content" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '1240px' }}>
        
        {/* =========================================================================
            ESTILO 1: CLÁSICO AGRO & TARJETA FLOTANTE (Split Hero)
           ========================================================================= */}
        {estilo === 'clasico' && (
          <div className="ofercampo-hero-grid" style={{ display: 'grid', gridTemplateColumns: isPreview ? '1.15fr 0.85fr' : undefined, gap: isPreview ? '0.75rem' : undefined, alignItems: 'center' }}>
            <div className="ofercampo-hero-left" style={{ alignItems: 'flex-start' }}>
              <div className="ofercampo-badge" style={{ marginBottom: isPreview ? '0.4rem' : undefined, padding: isPreview ? '0.2rem 0.6rem' : undefined }}>
                <img src={catThumb} alt={catName} className="ofercampo-badge-thumb" style={{ width: isPreview ? '20px' : undefined, height: isPreview ? '20px' : undefined }} onError={(e) => { e.target.src = '/img/Logo.jpg' }} />
                <span className="ofercampo-badge-title" style={{ fontSize: isPreview ? '0.74rem' : undefined }}>{catName}</span>
              </div>

              <h1 className="ofercampo-title" style={{ fontSize: isPreview ? '1.15rem' : undefined, marginBottom: isPreview ? '0.35rem' : undefined, lineHeight: isPreview ? 1.25 : undefined }}>
                {slide.title || slide.titulo || 'Cosechas Frescas y Tradición'}
              </h1>

              <p className="ofercampo-subtitle" style={{ fontSize: isPreview ? '0.78rem' : undefined, marginBottom: isPreview ? '0.5rem' : undefined, lineHeight: isPreview ? 1.35 : undefined }}>
                {slide.subtitle || slide.subtitulo || 'Directamente desde los Montes de María.'}
              </p>

              {features.length > 0 && (
                <div className="ofercampo-features" style={{ marginBottom: isPreview ? '0.6rem' : undefined, gap: isPreview ? '0.35rem' : undefined }}>
                  {features.map((feat, fIdx) => (
                    <span key={fIdx} className="ofercampo-feature-item" style={{ fontSize: isPreview ? '0.72rem' : undefined }}>
                      <i className="fa fa-check-circle" style={{ color: '#4ade80' }} /> {feat}
                    </span>
                  ))}
                </div>
              )}

              <div className="ofercampo-actions" style={{ gap: isPreview ? '0.4rem' : undefined }}>
                {renderPrimaryBtn(isPreview ? 'btn-sm' : '')}
                {renderSecondaryBtn(isPreview ? 'btn-sm' : '')}
              </div>
            </div>

            <div className="ofercampo-hero-right">
              <div className="ofercampo-visual-card" style={{ maxWidth: isPreview ? '220px' : '360px', padding: isPreview ? '0.75rem' : undefined, borderRadius: isPreview ? '12px' : undefined }}>
                <div className="ofercampo-product-preview-box" style={{ height: isPreview ? '105px' : '200px', marginBottom: isPreview ? '0.4rem' : undefined, position: 'relative' }}>
                  <img src={prodImg} alt={prodTitle} onError={(e) => { e.target.src = '/img/Logo.jpg' }} />
                  {badgeTop && (
                    <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#facc15', fontSize: isPreview ? '0.62rem' : '0.72rem', fontWeight: 800, padding: isPreview ? '2px 6px' : '3px 8px', borderRadius: '6px', border: '1px solid rgba(250,204,21,0.3)', zIndex: 2 }}>
                      {badgeTop}
                    </span>
                  )}
                </div>

                <div className="ofercampo-card-details">
                  <div className="ofercampo-card-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
                    <h4 className="ofercampo-card-title" style={{ fontSize: isPreview ? '0.85rem' : '1.15rem' }}>
                      {prodTitle}
                    </h4>
                    <span className="ofercampo-card-price" style={{ color: '#facc15', fontWeight: 800, fontSize: isPreview ? '0.8rem' : '1rem' }}>
                      {prodPrice}
                    </span>
                  </div>

                  <div className="ofercampo-card-vendor" style={{ marginTop: '0.3rem', fontSize: isPreview ? '0.7rem' : '0.75rem', padding: isPreview ? '0.2rem 0.45rem' : undefined }}>
                    <i className="fa fa-user-check" style={{ color: '#4ade80' }} />
                    <span>{vendorName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ESTILO 2: INMERSIVO & TIPOGRAFÍA GIGANTE (Fullscreen Modern)
           ========================================================================= */}
        {estilo === 'inmersivo' && (
          <div style={{ textAlign: 'center', maxWidth: '850px', margin: '0 auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: isPreview ? '0.2rem 0.65rem' : '0.4rem 1.1rem',
                borderRadius: '999px',
                marginBottom: isPreview ? '0.4rem' : '1.25rem',
                fontSize: isPreview ? '0.72rem' : '0.85rem',
                fontWeight: 700,
              }}
            >
              <img src={catThumb} alt={catName} style={{ width: isPreview ? '18px' : '22px', height: isPreview ? '18px' : '22px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/img/Logo.jpg' }} />
              <span>{catName}</span>
            </div>

            <h1 style={{ fontSize: isPreview ? '1.2rem' : '3.2rem', fontWeight: 900, lineHeight: 1.15, marginBottom: isPreview ? '0.4rem' : '1rem', textShadow: '0 4px 20px rgba(0,0,0,0.5)', letterSpacing: '-0.5px' }}>
              {slide.title || slide.titulo || 'El Campo Colombiano Directo a tu Hogar'}
            </h1>

            <p style={{ fontSize: isPreview ? '0.78rem' : '1.2rem', color: '#dcfce7', maxWidth: '680px', margin: isPreview ? '0 auto 0.6rem auto' : '0 auto 1.5rem auto', lineHeight: 1.4, fontWeight: 400 }}>
              {slide.subtitle || slide.subtitulo || 'Cosechas frescas, productos artesanales y alimentos del campo sin intermediarios.'}
            </p>

            {/* Feature Horizontal Strip from Database */}
            {features.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: isPreview ? '0.35rem' : '0.75rem', flexWrap: 'wrap', marginBottom: isPreview ? '0.75rem' : '1.8rem' }}>
                {features.map((feat, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: isPreview ? '0.2rem 0.55rem' : '0.35rem 0.9rem',
                      borderRadius: '8px',
                      fontSize: isPreview ? '0.68rem' : '0.85rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <i className="fa fa-check-circle" style={{ color: '#4ade80' }} /> {feat}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: isPreview ? '0.45rem' : '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {renderPrimaryBtn(isPreview ? 'btn-sm' : 'btn-lg-pulse')}
              {renderSecondaryBtn(isPreview ? 'btn-sm' : '')}
            </div>
          </div>
        )}

        {/* =========================================================================
            ESTILO 3: OFERTA FLASH & CUPONERA INTERACTIVA (Promocional)
           ========================================================================= */}
        {estilo === 'oferta_flash' && (
          <div className="hero-oferta-flash-grid" style={{ display: 'grid', gridTemplateColumns: isPreview ? '1.15fr 0.85fr' : '1.1fr 0.9fr', gap: isPreview ? '0.75rem' : '1.5rem', alignItems: 'center' }}>
            <div className="oferta-left">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ef4444', color: '#ffffff', padding: isPreview ? '0.2rem 0.65rem' : '0.35rem 1rem', borderRadius: '999px', fontWeight: 800, fontSize: isPreview ? '0.68rem' : '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: isPreview ? '0.4rem' : '1rem', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}>
                ⚡ OFERTA LIMITADA • {badgeTop}
              </div>

              <h1 style={{ fontSize: isPreview ? '1.15rem' : '2.5rem', fontWeight: 900, marginBottom: isPreview ? '0.35rem' : '0.75rem', lineHeight: 1.2 }}>
                {slide.title || slide.titulo || 'Gran Descuento Especial'}
              </h1>

              <p style={{ fontSize: isPreview ? '0.78rem' : '1.05rem', color: '#fed7aa', marginBottom: isPreview ? '0.55rem' : '1.25rem', lineHeight: 1.35 }}>
                {slide.subtitle || slide.subtitulo || 'Aprovecha precios directos de campesinos de los Montes de María con descuentos exclusivos.'}
              </p>

              {/* Cupón Card con Botón Copiar */}
              {cuponCod && (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px dashed #f59e0b',
                    borderRadius: '10px',
                    padding: isPreview ? '0.4rem 0.65rem' : '0.9rem 1.25rem',
                    marginBottom: isPreview ? '0.6rem' : '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span style={{ fontSize: isPreview ? '0.65rem' : '0.75rem', color: '#fef08a', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                      🎟️ Cupón
                    </span>
                    <strong style={{ fontSize: isPreview ? '0.95rem' : '1.25rem', letterSpacing: '1px', color: '#ffffff', fontFamily: 'monospace' }}>
                      {cuponCod}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCopyCoupon(e, cuponCod)}
                    style={{
                      background: copied ? '#22c55e' : '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      padding: isPreview ? '0.25rem 0.55rem' : '0.5rem 1rem',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: isPreview ? '0.7rem' : '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <i className={`fa ${copied ? 'fa-check' : 'fa-copy'}`} />
                    {copied ? '¡Listo!' : 'Copiar'}
                  </button>
                </div>
              )}

              <div className="ofercampo-actions" style={{ gap: isPreview ? '0.4rem' : undefined }}>
                {renderPrimaryBtn(isPreview ? 'btn-sm' : '', slide.boton_principal_texto || '¡Comprar con Descuento!', 'fa-bolt')}
                {renderSecondaryBtn(isPreview ? 'btn-sm' : '')}
              </div>
            </div>

            {/* Right: Product Flash Card with Ribbon */}
            <div className="oferta-right" style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  borderRadius: isPreview ? '14px' : '20px',
                  padding: isPreview ? '0.75rem' : '1.25rem',
                  maxWidth: isPreview ? '220px' : '340px',
                  width: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                }}
              >
                {/* Diagonal Ribbon */}
                <div
                  style={{
                    position: 'absolute',
                    top: isPreview ? '12px' : '18px',
                    right: isPreview ? '-30px' : '-32px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: isPreview ? '0.62rem' : '0.72rem',
                    padding: isPreview ? '2px 30px' : '4px 38px',
                    transform: 'rotate(45deg)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: '0.5px',
                    zIndex: 5,
                  }}
                >
                  🔥 OFERTA
                </div>

                <div style={{ height: isPreview ? '105px' : '190px', borderRadius: '10px', overflow: 'hidden', marginBottom: isPreview ? '0.45rem' : '0.85rem' }}>
                  <img src={prodImg} alt={prodTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/img/Logo.jpg' }} />
                </div>

                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: isPreview ? '0.85rem' : '1.15rem', fontWeight: 800 }}>
                  {prodTitle}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: isPreview ? '0.35rem' : '0.6rem' }}>
                  <span style={{ fontSize: isPreview ? '0.95rem' : '1.3rem', fontWeight: 900, color: '#facc15' }}>
                    {prodPrice}
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: isPreview ? '0.25rem 0.5rem' : '0.4rem 0.65rem', borderRadius: '6px', fontSize: isPreview ? '0.68rem' : '0.75rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="fa fa-user-check" />
                  <span>{vendorName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ESTILO 4: MOSAICO CAMPESINO (Pilares y Beneficios Directos)
           ========================================================================= */}
        {estilo === 'mosaico' && (
          <div className="hero-mosaico-grid" style={{ display: 'grid', gridTemplateColumns: isPreview ? '1.1fr 0.9fr' : '1.05fr 0.95fr', gap: isPreview ? '0.75rem' : '1.5rem', alignItems: 'center' }}>
            <div>
              <div className="ofercampo-badge" style={{ marginBottom: isPreview ? '0.4rem' : '0.75rem', padding: isPreview ? '0.2rem 0.6rem' : undefined }}>
                <img src={catThumb} alt={catName} className="ofercampo-badge-thumb" style={{ width: isPreview ? '18px' : undefined, height: isPreview ? '18px' : undefined }} onError={(e) => { e.target.src = '/img/Logo.jpg' }} />
                <span className="ofercampo-badge-title" style={{ fontSize: isPreview ? '0.72rem' : undefined }}>🌱 {catName}</span>
              </div>

              <h1 style={{ fontSize: isPreview ? '1.15rem' : '2.4rem', fontWeight: 900, marginBottom: isPreview ? '0.4rem' : '0.85rem', lineHeight: 1.2 }}>
                {slide.title || slide.titulo || 'Cosechas Tradicionales con Alma de Campo'}
              </h1>

              <p style={{ fontSize: isPreview ? '0.78rem' : '1rem', color: '#e2e8f0', marginBottom: isPreview ? '0.6rem' : '1.25rem', lineHeight: 1.35 }}>
                {slide.subtitle || slide.subtitulo || 'Conectamos a campesinos de Bolívar y Sucre con familias de toda Colombia sin intermediarios.'}
              </p>

              <div className="ofercampo-actions" style={{ gap: isPreview ? '0.4rem' : undefined }}>
                {renderPrimaryBtn(isPreview ? 'btn-sm' : '')}
                {renderSecondaryBtn(isPreview ? 'btn-sm' : '')}
              </div>
            </div>

            {/* Right: Dynamic Feature Pillars Grid from Database */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: isPreview ? '0.4rem' : '0.75rem' }}>
              {(features.length > 0
                ? features.map((featText, fIdx) => ({
                    icon: fIdx === 0 ? 'fa-seedling' : fIdx === 1 ? 'fa-truck-fast' : 'fa-hand-holding-dollar',
                    color: fIdx === 0 ? '#4ade80' : fIdx === 1 ? '#60a5fa' : '#facc15',
                    title: featText,
                    desc: fIdx === 0 ? 'Cultivado en Montes de María.' : fIdx === 1 ? 'Despacho garantizado.' : 'Apoyo 100% directo.',
                  }))
                : [
                    { icon: 'fa-seedling', color: '#4ade80', title: '100% Cosecha Orgánica', desc: 'Cultivado en Montes de María.' },
                    { icon: 'fa-truck-fast', color: '#60a5fa', title: 'Despacho Directo', desc: 'Despacho garantizado.' },
                    { icon: 'fa-hand-holding-dollar', color: '#facc15', title: 'Pago 100% Justo', desc: 'Apoyo 100% directo.' },
                  ]
              ).map((pill, pIdx) => (
                <div
                  key={pIdx}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    borderRadius: isPreview ? '10px' : '14px',
                    padding: isPreview ? '0.45rem 0.65rem' : '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isPreview ? '0.5rem' : '0.85rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                  }}
                >
                  <div
                    style={{
                      width: isPreview ? '28px' : '40px',
                      height: isPreview ? '28px' : '40px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: pill.color,
                      fontSize: isPreview ? '0.9rem' : '1.2rem',
                      flexShrink: 0,
                    }}
                  >
                    <i className={`fa ${pill.icon}`} />
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 1px 0', fontSize: isPreview ? '0.74rem' : '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                      {pill.title}
                    </h5>
                    <p style={{ margin: 0, fontSize: isPreview ? '0.66rem' : '0.78rem', color: '#cbd5e1', lineHeight: 1.25 }}>
                      {pill.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            ESTILO 5: HISTORIA CAMPESINA & ORIGEN (Farmer Heritage)
           ========================================================================= */}
        {estilo === 'historia_campesina' && (
          <div className="hero-historia-grid" style={{ display: 'grid', gridTemplateColumns: isPreview ? '1.15fr 0.85fr' : '1.1fr 0.9fr', gap: isPreview ? '0.75rem' : '1.5rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#d97706', color: '#ffffff', padding: isPreview ? '0.2rem 0.6rem' : '0.3rem 0.85rem', borderRadius: '999px', fontSize: isPreview ? '0.65rem' : '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: isPreview ? '0.4rem' : '0.75rem' }}>
                🇨🇴 {catName ? `${catName.toUpperCase()}` : 'HISTORIA & TRADICIÓN'}
              </div>

              <h1 style={{ fontSize: isPreview ? '1.15rem' : '2.4rem', fontWeight: 900, marginBottom: isPreview ? '0.35rem' : '0.75rem', lineHeight: 1.2 }}>
                {slide.title || slide.titulo || 'Cosechado con Amor en Montes de María'}
              </h1>

              {/* Farmer Quote Box from Database */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  borderLeft: '3px solid #f59e0b',
                  borderRadius: '0 10px 10px 0',
                  padding: isPreview ? '0.35rem 0.6rem' : '0.85rem 1.1rem',
                  marginBottom: isPreview ? '0.55rem' : '1.25rem',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: isPreview ? '0.72rem' : '0.95rem', color: '#fef3c7', lineHeight: 1.35 }}>
                  “{slide.subtitle || slide.subtitulo || 'Cada fruto que sembramos lleva el sudor, la esperanza y la tradición de nuestras veredas.'}”
                </p>
              </div>

              {/* Farmer Profile Strip from Database */}
              {vendorName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: isPreview ? '0.45rem' : '0.75rem', marginBottom: isPreview ? '0.55rem' : '1.25rem' }}>
                  <div style={{ width: isPreview ? '30px' : '46px', height: isPreview ? '30px' : '46px', borderRadius: '50%', border: '2px solid #facc15', backgroundColor: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src={catThumb || '/img/Logo.jpg'}
                      alt={vendorName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = '/img/Logo.jpg' }}
                    />
                  </div>
                  <div>
                    <strong style={{ fontSize: isPreview ? '0.78rem' : '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {vendorName} <i className="fa fa-check-circle" style={{ color: '#4ade80', fontSize: '0.75rem' }} title="Productor Verificado" />
                    </strong>
                    {(badgeTop || vendorRating) ? (
                      <span style={{ fontSize: isPreview ? '0.65rem' : '0.75rem', color: '#bbf7d0' }}>
                        {badgeTop && vendorRating ? `${badgeTop} • ${vendorRating}` : (badgeTop || vendorRating)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="ofercampo-actions" style={{ gap: isPreview ? '0.4rem' : undefined }}>
                {renderPrimaryBtn(isPreview ? 'btn-sm' : '', slide.boton_principal_texto || 'Comprar Cosecha', 'fa-seedling')}
                {renderSecondaryBtn(isPreview ? 'btn-sm' : '', slide.boton_secundario_texto || 'Conocer Productor', 'fa-store')}
              </div>
            </div>

            {/* Right: Rustic Postal Card with Product Photo from Database */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: isPreview ? '0.55rem' : '0.85rem',
                  borderRadius: isPreview ? '12px' : '16px',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
                  maxWidth: isPreview ? '200px' : '320px',
                  width: '100%',
                  transform: 'rotate(-2deg)',
                  color: '#1e293b',
                }}
              >
                <div style={{ height: isPreview ? '100px' : '190px', borderRadius: '8px', overflow: 'hidden', marginBottom: isPreview ? '0.4rem' : '0.75rem' }}>
                  <img src={prodImg} alt={prodTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/img/Logo.jpg' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h4 style={{ margin: 0, fontSize: isPreview ? '0.8rem' : '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {prodTitle}
                  </h4>
                  {prodPrice ? (
                    <span style={{ fontWeight: 800, color: '#166534', fontSize: isPreview ? '0.75rem' : '0.9rem' }}>
                      {prodPrice}
                    </span>
                  ) : null}
                </div>
                {badgeTop ? (
                  <p style={{ margin: '2px 0 0 0', fontSize: isPreview ? '0.62rem' : '0.72rem', color: '#64748b' }}>
                    📍 {badgeTop}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
