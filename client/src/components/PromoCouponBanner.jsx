import { useState, useEffect } from 'react'
import { listarCuponesPromocionales } from '../api/cupones.api'
import { useToast } from '../context/ToastContext'

export default function PromoCouponBanner() {
  const [promos, setPromos] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const toast = useToast()

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

  // Auto-rotate if multiple promo coupons exist
  useEffect(() => {
    if (promos.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promos.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [promos.length])

  if (dismissed || promos.length === 0) return null

  const currentPromo = promos[currentIndex]
  if (!currentPromo) return null

  const handleCopy = (e, code) => {
    e.preventDefault()
    e.stopPropagation()
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
      toast.success(`¡Cupón "${code}" copiado al portapapeles! Úsalo al pagar para obtener tu descuento.`)
    } else {
      toast.info(`Cupón: ${code}`)
    }
  }

  const discountBadge = currentPromo.descuento_porcentaje
    ? `${Number(currentPromo.descuento_porcentaje)}% OFF`
    : currentPromo.descuento_fijo
    ? `$${Number(currentPromo.descuento_fijo).toLocaleString('es-CO')} OFF`
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
      style={{
        background: `linear-gradient(90deg, ${themeColor} 0%, #0f172a 100%)`,
        color: '#ffffff',
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'relative',
        zIndex: 999,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        transition: 'background 0.4s ease',
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
            onClick={() => setCurrentIndex((prev) => (prev - 1 + promos.length) % promos.length)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: '0.2rem 0.4rem',
            }}
            title="Anterior promoción"
          >
            <i className="fa fa-chevron-left" />
          </button>
        )}

        {/* Center content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '0.65rem',
            textAlign: 'center',
          }}
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
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.92')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            title="Copiar cupón"
          >
            <i className="fa fa-tag" style={{ color: themeColor }} />
            <span>{currentPromo.codigo}</span>
            <i className="fa fa-copy" style={{ opacity: 0.65, fontSize: '0.75rem' }} />
          </button>
        </div>

        {/* Right / Next arrow & Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {promos.length > 1 && (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % promos.length)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '0.2rem 0.4rem',
              }}
              title="Siguiente promoción"
            >
              <i className="fa fa-chevron-right" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '0.2rem',
            }}
            title="Ocultar barra"
          >
            <i className="fa fa-times" />
          </button>
        </div>
      </div>
    </aside>
  )
}
