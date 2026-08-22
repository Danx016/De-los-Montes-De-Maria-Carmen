import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Si ya está ejecutándose como app instalada (standalone), no mostrar
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    if (isStandalone) return

    // Detectar si fue descartado recientemente (en las últimas 24 horas)
    const dismissedUntil = localStorage.getItem('pwa_prompt_dismissed_until')
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return

    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent)
    const isSafari =
      /safari/.test(userAgent) &&
      !/chrome|crios|fxios|optios|duckduckgo/.test(userAgent)

    if (isAppleDevice && isSafari) {
      setIsIOS(true)
      // Mostrar con retraso en iOS para no saturar al usuario
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // Capturar evento estándar de instalación en Android / Chrome / Edge
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // No volver a mostrar por 24 horas
    localStorage.setItem(
      'pwa_prompt_dismissed_until',
      (Date.now() + 24 * 60 * 60 * 1000).toString()
    )
  }

  if (!showPrompt) return null

  return (
    <aside
      className="pwa-install-banner fade-in"
      role="region"
      aria-label="Instalación de Aplicación Web Móvil"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 2rem)',
        maxWidth: '460px',
        zIndex: 9990,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(67, 142, 68, 0.3)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
        borderRadius: '18px',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img
          src="/img/Logo.jpg"
          alt="De los Montes de María"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            objectFit: 'cover',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            border: '1.5px solid #438E44',
          }}
        />
        <div>
          <strong
            style={{
              display: 'block',
              fontSize: '0.92rem',
              color: '#1e293b',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            De los Montes de María
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {isIOS
              ? 'Toca Compartir y "Añadir a pantalla de inicio"'
              : 'Instala la app para comprar más rápido'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="btn btn-primary"
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(67, 142, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa fa-download" /> Instalar
          </button>
        )}

        <button
          onClick={handleDismiss}
          aria-label="Cerrar notificación"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '0.3rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className="fa fa-times" />
        </button>
      </div>
    </aside>
  )
}
