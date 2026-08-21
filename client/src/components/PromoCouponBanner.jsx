import { useState, useEffect, useRef } from 'react'
import { listarCuponesPromocionales } from '../api/cupones.api'
import { useToast } from '../context/ToastContext'

export default function PromoCouponBanner() {
  const [promos, setPromos] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animClass, setAnimClass] = useState('promo-slide-in-right')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)
  const toast = useToast()
  const transitionTimeoutRef = useRef(null)

  useEffect(() => {
    listarCuponesPromocionales()
      .then((res) => {
        const list = res.data?.cupones || []
        setPromos(list)
      })
      .catch((err) => {
        console.error('Error al cargar barra de cupones promocionales:', err)
      })
  }, [])

  const goToPromo = (newIndex, direction = 'next') => {
    if (isTransitioning || promos.length <= 1) return
    setIsTransitioning(true)

    // Trigger exit animation
    const exitClass = direction === 'next' ? 'promo-slide-out-left' : 'promo-slide-out-right'
    const enterClass = direction === 'next' ? 'promo-slide-in-right' : 'promo-slide-in-left'
    setAnimClass(exitClass)

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)

    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(newIndex)
      setAnimClass(enterClass)
      setIsTransitioning(false)
    }, 240)
  }

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % promos.length
    goToPromo(nextIdx, 'next')
  }

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + promos.length) % promos.length
    goToPromo(prevIdx, 'prev')
  }

  // Auto-rotate if multiple promo coupons exist and not hovered
  useEffect(() => {
    if (promos.length <= 1 || isPaused) return
    const timer = setInterval(() => {
      handleNext()
    }, 6000)
    return () => {
      clearInterval(timer)
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [promos.length, currentIndex, isPaused, isTransitioning])

  if (dismissed || promos.length === 0) return null

  const currentPromo = promos[currentIndex]
  if (!currentPromo) return null

  const handleCopy = (e, code) => {
    e.preventDefault()
    e.stopPropagation()
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2500)
      toast.success(`¡Cupón "${code}" copiado al portapapeles! Úsalo al pagar para obtener tu descuento.`)
    } else {
      toast.info(`Cupón: ${code}`)
    }
  }

  const pct = Number(currentPromo.descuento_porcentaje || 0)
  const fijo = Number(currentPromo.descuento_fijo || 0)
  const discountBadge = pct > 0
    ? `${pct}% OFF`
    : fijo > 0
    ? `$${fijo.toLocaleString('es-CO')} COP OFF`
    : 'Descuento Especial'

  const message =
    currentPromo.mensaje_promocional ||
    `¡Aprovecha nuestro descuento exclusivo! Usa el código ${currentPromo.codigo} en tu pedido.`

  const themeColor = currentPromo.color_tema || '#059669'

  return (
    <aside
      className="promo-coupon-bar"
      role="region"
      aria-label="Barra Promocional de Cupones"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        background: `linear-gradient(90deg, ${themeColor} 0%, #0f172a 100%)`,
        color: '#ffffff',
        padding: '0.45rem 1rem',
        fontSize: '0.85rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'relative',
        zIndex: 999,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div
        className="app-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Left / Prev arrow if multiple */}
        {promos.length > 1 && (
          <button
            type="button"
            className="promo-nav-btn"
            onClick={handlePrev}
            disabled={isTransitioning}
            title="Anterior promoción"
            aria-label="Anterior promoción"
          >
            <i className="fa fa-chevron-left" />
          </button>
        )}

        {/* Center animated content track */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            key={currentPromo.id_cupon || currentIndex}
            className={`promo-banner-track ${animClass}`}
          >
            <span
              style={{
                background: '#ffffff',
                color: themeColor,
                padding: '0.15rem 0.55rem',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.74rem',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              <i className="fa fa-bolt" /> {discountBadge}
            </span>

            <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{message}</span>

            <button
              type="button"
              className="promo-copy-btn"
              onClick={(e) => handleCopy(e, currentPromo.codigo)}
              style={{
                background: '#ffffff',
                color: themeColor,
                border: 'none',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              }}
              title="Copiar cupón"
            >
              <i className="fa fa-tag" style={{ color: themeColor }} />
              <span>{currentPromo.codigo}</span>
              {copiedCode === currentPromo.codigo ? (
                <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <i className="fa fa-check" /> Copiado
                </span>
              ) : (
                <i className="fa fa-copy" style={{ opacity: 0.65, fontSize: '0.75rem' }} />
              )}
            </button>
          </div>
        </div>

        {/* Right / Next arrow & Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {promos.length > 1 && (
            <button
              type="button"
              className="promo-nav-btn"
              onClick={handleNext}
              disabled={isTransitioning}
              title="Siguiente promoción"
              aria-label="Siguiente promoción"
            >
              <i className="fa fa-chevron-right" />
            </button>
          )}

          <button
            type="button"
            className="promo-nav-btn"
            onClick={() => setDismissed(true)}
            title="Ocultar barra"
            aria-label="Ocultar barra"
          >
            <i className="fa fa-times" />
          </button>
        </div>
      </div>
    </aside>
  )
}
