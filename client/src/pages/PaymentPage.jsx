import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { crearCompra, enviarOtp, verificarOtp } from '../api/compras.api'
import { validarCupon } from '../api/cupones.api'
import InvoiceModal from '../components/InvoiceModal'

export default function PaymentPage() {
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [shippingInfo, setShippingInfo] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [error, setError] = useState('')

  // ── Cupón de Descuento State ──
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  // ── OTP Security State ──
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  const costoEnvio = 15000
  const discountAmount = appliedCoupon ? Number(appliedCoupon.descuento || 0) : 0
  const totalConDescuento = Math.max(0, total - discountAmount)
  const totalConEnvio = totalConDescuento + costoEnvio

  useEffect(() => {
    if (orderSuccess) return
    const savedShipping = sessionStorage.getItem('checkout_shipping')
    if (!savedShipping || items.length === 0) {
      navigate('/carrito')
      return
    }
    setShippingInfo(JSON.parse(savedShipping))
  }, [items, navigate, orderSuccess])

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const formatCOP = (val) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0)

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return

    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await validarCupon({ codigo: couponInput.trim(), monto_compra: total })
      const c = res.data?.cupon
      setAppliedCoupon(c)
      toast.success(`¡Cupón "${c.codigo}" aplicado con éxito!`)
    } catch (err) {
      setCouponError(
        err.response?.data?.error ||
          'Cupón inválido o expirado. Por favor intenta con otro código.'
      )
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
    toast.info('Cupón removido de la orden')
  }

  const handleInitiatePayment = async () => {
    setError('')
    const userEmail = user?.correo || shippingInfo?.correo
    if (!userEmail) {
      setError('No se encontró un correo electrónico válido para enviar el código de seguridad.')
      return
    }

    setSendingOtp(true)
    try {
      await enviarOtp({
        email: userEmail,
        nombre: shippingInfo?.nombre_destinatario || user?.nombre || 'Estimado(a) Cliente',
        total: totalConEnvio,
      })
      setShowOtpModal(true)
      setOtpCode('')
      setOtpError('')
      setResendTimer(60)
      toast.info(`Código de seguridad enviado a ${userEmail}`)
    } catch (err) {
      setError(
        err.response?.data?.error || 'No se pudo enviar el código de seguridad al correo. Inténtalo de nuevo.'
      )
    } finally {
      setSendingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    const userEmail = user?.correo || shippingInfo?.correo
    setSendingOtp(true)
    setOtpError('')
    try {
      await enviarOtp({
        email: userEmail,
        nombre: shippingInfo?.nombre_destinatario || user?.nombre || 'Estimado(a) Cliente',
        total: totalConEnvio,
      })
      setResendTimer(60)
      toast.info('Nuevo código de seguridad enviado a tu correo')
    } catch (err) {
      setOtpError('Error al reenviar el código. Inténtalo en un momento.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyAndConfirmOrder = async (e) => {
    e.preventDefault()
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError('Por favor ingresa el código de seguridad.')
      return
    }

    setVerifyingOtp(true)
    setOtpError('')

    try {
      const userEmail = user?.correo || shippingInfo?.correo
      await verificarOtp({ email: userEmail, code: otpCode.trim() })

      const userId = user?.id || user?.id_usuario || user?.idUser
      const addressString = `${shippingInfo?.direccion || ''}, ${shippingInfo?.ciudad || ''} - ${shippingInfo?.departamento || ''}`

      const resCompra = await crearCompra({
        idUser: userId,
        productos: items.map((i) => ({ id_producto: i.id_producto || i.id, cantidad: i.cantidad, precio: i.precio })),
        metodo_pago: 'Contra Entrega (Efectivo)',
        metodoPago: 'Contra Entrega (Efectivo)',
        direccion: addressString,
        total: totalConEnvio,
        codigo_cupon: appliedCoupon?.codigo || null,
        descuento: discountAmount,
        shippingInfo,
      })

      const compraId = resCompra.data?.id_compra || resCompra.data?.id || 'MM-' + Math.floor(1000 + Math.random() * 9000)
      setShowOtpModal(false)
      setOrderSuccess({ id_compra: compraId })
      setShowInvoice(true)
      clearCart()
      sessionStorage.removeItem('checkout_shipping')
    } catch (err) {
      setOtpError('Código inválido o expirado. Por favor verifica el correo.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="app-container">
          <div className="checkout-stepper">
            <span className="step-badge completed">1. Carrito</span>
            <span className="step-arrow">→</span>
            <span className="step-badge completed">2. Envío</span>
            <span className="step-arrow">→</span>
            <span className="step-badge active">3. Pago Contra Entrega</span>
          </div>

          {orderSuccess ? (
            <div className="card order-success-card fade-in" style={{ marginTop: '2rem' }}>
              <div className="success-icon-wrap">
                <i className="fa fa-check-circle" />
              </div>
              <h2>¡Pedido Confirmado con Éxito!</h2>
              <p className="order-number">N° de Orden: <strong>{orderSuccess.id_compra}</strong></p>
              <p className="order-desc">
                Tu pago contra entrega ha sido registrado con éxito. Hemos enviado tu <strong>factura electrónica oficial</strong> a tu correo (<strong>{user?.correo || shippingInfo?.correo}</strong>).
              </p>
              {/* Telegram Tracking Card */}
              <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    <i className="fab fa-telegram" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ fontSize: '0.98rem', color: '#0369a1', display: 'block' }}>¿Recibir rastreo de tu despacho en Telegram?</strong>
                    <span style={{ fontSize: '0.84rem', color: '#475569' }}>Te avisamos automáticamente cuando tu pedido esté en camino a tu puerta.</span>
                  </div>
                </div>
                <a
                  href={`https://t.me/montesdemariabot?start=pedido_${orderSuccess.id_compra}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{ background: '#0284c7', color: '#ffffff', fontWeight: 800, borderRadius: '999px', padding: '0.55rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}
                >
                  <i className="fab fa-telegram" /> Activar Rastreo en Telegram
                </a>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setShowInvoice(true)} className="btn btn-primary btn-lg">
                  <i className="fa fa-file-invoice" /> Ver Factura Electrónica
                </button>
                <Link to="/perfil" className="btn btn-outline-primary btn-lg">
                  Ver Mis Pedidos
                </Link>
                <Link to="/" className="btn btn-outline-success btn-lg">
                  Seguir Comprando
                </Link>
              </div>
            </div>
          ) : (
            <div className="cart-layout-grid fade-in" style={{ marginTop: '2rem' }}>
              {/* Payment Info */}
              <div className="cart-items-column">
                <div className="card">
                  <h2>
                    <i className="fa fa-shield-alt text-primary" /> Método de Pago & Seguridad
                  </h2>
                  <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                    Para tu total seguridad y tranquilidad, pagas en efectivo únicamente cuando recibas los productos en tu domicilio.
                  </p>

                  {error && (
                    <div className="alert alert-danger fade-in" style={{ marginBottom: '1.5rem' }}>
                      <i className="fa fa-exclamation-circle" /> {error}
                    </div>
                  )}

                  <div className="payment-options-grid">
                    <div
                      className="payment-method-card active"
                      style={{
                        cursor: 'default',
                        border: '2px solid var(--primary-color)',
                        backgroundColor: 'rgba(46, 125, 50, 0.04)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="radio"
                          name="payment_method"
                          value="contraentrega"
                          checked={true}
                          readOnly
                          style={{ accentColor: 'var(--primary-color)', width: '18px', height: '18px' }}
                        />
                        <div className="method-icon-box" style={{ color: 'var(--primary-color)' }}>
                          <i className="fa fa-hand-holding-usd" style={{ fontSize: '1.4rem' }} />
                        </div>
                        <div className="method-text" style={{ flex: 1 }}>
                          <strong style={{ fontSize: '1rem' }}>Pago Contra Entrega (Efectivo)</strong>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                            Pagas en efectivo al momento de recibir los productos en la puerta de tu casa o finca. ¡Directo del campo sin intermediarios!
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '1.5rem',
                      background: 'rgba(46, 125, 50, 0.08)',
                      border: '1px solid rgba(46, 125, 50, 0.25)',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <i className="fa fa-lock text-primary" style={{ fontSize: '1.75rem' }} />
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      <strong>Autenticación de Compra Segura:</strong>
                      <br />
                      Al hacer clic en "Confirmar y Pagar", se enviará un código de seguridad a tu correo <strong>{user?.correo || shippingInfo?.correo || 'registrado'}</strong> para autorizar el despacho y emitir tu factura electrónica de venta oficial.
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Summary */}
              <div className="cart-summary-column">
                {/* Widget Cupón de Descuento */}
                <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem' }}>
                    <i className="fa fa-ticket-alt text-success" /> ¿Tienes un cupón de descuento?
                  </h4>

                  {appliedCoupon ? (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1.5px dashed var(--primary-color, #16a34a)',
                        borderRadius: '12px',
                        padding: '0.9rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              backgroundColor: 'var(--primary-color, #16a34a)',
                              color: '#ffffff',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {appliedCoupon.codigo}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-color, #16a34a)' }}>
                            {appliedCoupon.descuento_porcentaje ? `-${appliedCoupon.descuento_porcentaje}%` : 'Monto Fijo'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main, #333)', marginTop: '4px' }}>
                          Ahorraste <strong style={{ color: 'var(--primary-color, #16a34a)' }}>-{formatCOP(discountAmount)}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#dc2626',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2' }}
                        title="Quitar cupón"
                      >
                        <i className="fa fa-trash-alt" style={{ fontSize: '0.75rem' }} /> Quitar
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Ej: MONTES10 o CAMPO20"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="form-input form-input-sm"
                        style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}
                      />
                      <button
                        type="submit"
                        disabled={couponLoading || !couponInput.trim()}
                        className="btn btn-outline-primary btn-sm"
                        style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                      >
                        {couponLoading ? <i className="fa fa-spinner fa-spin" /> : 'Aplicar'}
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <div className="alert alert-danger" style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      <i className="fa fa-exclamation-circle" /> {couponError}
                    </div>
                  )}
                </div>

                <div className="card cart-summary-card">
                  <h3>Resumen de la Orden</h3>
                  <hr />
                  <div className="summary-row">
                    <span>Subtotal ({items.length} productos)</span>
                    <strong>{formatCOP(total)}</strong>
                  </div>

                  {discountAmount > 0 && (
                    <div className="summary-row" style={{ color: '#16a34a' }}>
                      <span>
                        <i className="fa fa-tag" /> Cupón ({appliedCoupon?.codigo})
                      </span>
                      <strong>-{formatCOP(discountAmount)}</strong>
                    </div>
                  )}

                  <div className="summary-row">
                    <span>Despacho / Envío</span>
                    <strong>{formatCOP(costoEnvio)}</strong>
                  </div>
                  <hr />
                  <div className="summary-row total-row">
                    <span>Total a Pagar</span>
                    <span className="total-price">{formatCOP(totalConEnvio)}</span>
                  </div>

                  <button
                    onClick={handleInitiatePayment}
                    disabled={sendingOtp || processing}
                    className="btn btn-primary btn-block btn-lg"
                    style={{ marginTop: '1.5rem', padding: '1rem', fontWeight: 700 }}
                  >
                    {sendingOtp ? (
                      <>
                        <i className="fa fa-spinner fa-spin" /> Enviando Código de Seguridad...
                      </>
                    ) : (
                      <>
                        <i className="fa fa-shield-alt" /> Confirmar y Pagar (Contra Entrega)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal de Verificación de Código OTP para Pagar ── */}
      {showOtpModal && (
        <div
          className="modal-overlay fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            boxSizing: 'border-box',
          }}
          onClick={() => !verifyingOtp && setShowOtpModal(false)}
        >
          <div
            className="modal-content card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '2.25rem 2rem',
              borderRadius: '20px',
              backgroundColor: 'var(--card-bg, #ffffff)',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.45)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              disabled={verifyingOtp}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: 'var(--text-muted)',
              }}
              title="Cerrar"
            >
              <i className="fa fa-times" />
            </button>

            <div
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                backgroundColor: 'rgba(46, 125, 50, 0.12)',
                color: 'var(--primary-color, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                fontSize: '2rem',
              }}
            >
              <i className="fa fa-envelope-open-text" />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>
              Código de Seguridad Requerido
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Hemos enviado un código de 6 dígitos a:
              <br />
              <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {user?.correo || shippingInfo?.correo}
              </strong>
            </p>

            {otpError && (
              <div
                className="alert alert-danger fade-in"
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <i className="fa fa-exclamation-triangle" /> {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyAndConfirmOrder}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  style={{
                    width: '200px',
                    height: '56px',
                    fontSize: '1.8rem',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: '2px solid var(--primary-color, #16a34a)',
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)',
                  }}
                />
                <button
                  type="button"
                  title="Pegar código del portapapeles"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      const clean = text.replace(/\D/g, '').slice(0, 6)
                      if (clean) setOtpCode(clean)
                    } catch (e) {}
                  }}
                  className="btn"
                  style={{
                    height: '56px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    color: '#166534',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa fa-paste" /> Pegar
                </button>
              </div>

              <button
                type="submit"
                disabled={verifyingOtp || otpCode.length !== 6}
                className="btn btn-primary btn-block btn-lg"
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  padding: '0.9rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 14px rgba(46, 125, 50, 0.3)',
                }}
              >
                {verifyingOtp ? (
                  <>
                    <i className="fa fa-spinner fa-spin" /> Verificando y Generando Factura...
                  </>
                ) : (
                  <>
                    <i className="fa fa-check-circle" /> Confirmar Orden de Compra
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ¿No recibiste el código?{' '}
              {resendTimer > 0 ? (
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                  Reenviar en {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={sendingOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  {sendingOtp ? 'Enviando...' : 'Reenviar código'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Factura Electrónica Oficial ── */}
      {showInvoice && orderSuccess && (
        <InvoiceModal
          idCompra={orderSuccess.id_compra}
          onClose={() => setShowInvoice(false)}
        />
      )}

      <Footer />
    </>
  )
}
