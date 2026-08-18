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
    if (orderSuccess) return // Si la compra fue exitosa, permanecer en pantalla de éxito/factura
    const savedShipping = sessionStorage.getItem('checkout_shipping')
    if (!savedShipping || items.length === 0) {
      navigate('/carrito')
      return
    }
    setShippingInfo(JSON.parse(savedShipping))
  }, [items, navigate, orderSuccess])

  // Timer cooldown for OTP resend
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
    Number(val || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  // ── Cupón Handlers ──
  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault()
    if (!couponInput || !couponInput.trim()) {
      setCouponError('Ingresa un código de cupón.')
      return
    }
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await validarCupon({
        codigo: couponInput.trim(),
        monto_compra: total,
      })
      const c = res.data?.cupon
      setAppliedCoupon(c)
      setCouponError('')
      toast.success(
        `¡Cupón "${c.codigo}" aplicado! Descuento: -${formatCOP(c.descuento)} (${c.descuento_porcentaje ? `${c.descuento_porcentaje}%` : 'Monto fijo'})`
      )
    } catch (err) {
      setAppliedCoupon(null)
      setCouponError(err.response?.data?.error || 'Cupón no válido, inactivo o expirado.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
    toast.info('Cupón removido de la orden.')
  }

  // Paso 1: Iniciar el proceso y enviar el código de seguridad al correo
  const handleInitiatePayment = async () => {
    setError('')
    setOtpError('')
    setSendingOtp(true)

    const userEmail = user?.correo || shippingInfo?.correo || shippingInfo?.email
    if (!userEmail) {
      setError('No se encontró un correo electrónico asociado para enviar el código de seguridad.')
      setSendingOtp(false)
      return
    }

    try {
      await enviarOtp({
        email: userEmail,
        nombre: user?.nombre || shippingInfo?.nombre_destinatario || 'Cliente',
        total: totalConEnvio,
      })
      setShowOtpModal(true)
      setResendTimer(45)
      setOtpCode('')
      toast.info(`Código de seguridad enviado a: ${userEmail}`)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'No se pudo enviar el código de seguridad al correo. Inténtalo nuevamente.'
      )
    } finally {
      setSendingOtp(false)
    }
  }

  // Reenviar código OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    setSendingOtp(true)
    setOtpError('')
    const userEmail = user?.correo || shippingInfo?.correo
    try {
      await enviarOtp({
        email: userEmail,
        nombre: user?.nombre || 'Cliente',
        total: totalConEnvio,
      })
      setResendTimer(45)
      toast.success('¡Nuevo código enviado a tu correo!')
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Error al reenviar el código.')
    } finally {
      setSendingOtp(false)
    }
  }

  // Paso 2: Verificar el código OTP y confirmar la compra + enviar factura
  const handleVerifyAndConfirmOrder = async (e) => {
    if (e) e.preventDefault()
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError('Ingresa el código de seguridad que enviamos a tu correo.')
      return
    }

    setVerifyingOtp(true)
    setOtpError('')

    const userEmail = user?.correo || shippingInfo?.correo
    try {
      // 1. Validar OTP
      await verificarOtp({
        email: userEmail,
        code: otpCode.trim(),
      })

      // 2. Crear la orden de compra
      const userId = user?.id || user?.id_usuario || user?.idUser
      const addressString = shippingInfo?.direccion
        ? `${shippingInfo.direccion}, ${shippingInfo.ciudad || shippingInfo.municipio || ''} - ${shippingInfo.departamento || ''} (Recibe: ${shippingInfo.nombre_destinatario || user?.nombre || ''}, Tel: ${shippingInfo.telefono || ''})`
        : 'Dirección confirmada en checkout'

      const resCompra = await crearCompra({
        idUser: userId,
        id_usuario: userId,
        productos: items.map((i) => ({
          id_producto: i.id_producto || i.id,
          idProducto: i.id_producto || i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
          precio: i.precio,
        })),
        metodo_pago: 'Contra Entrega (Efectivo)',
        metodoPago: 'Contra Entrega (Efectivo)',
        id_direccion: shippingInfo?.id_direccion,
        direccion: addressString,
        direccion_envio: addressString,
        total: totalConEnvio,
        codigo_cupon: appliedCoupon?.codigo || null,
        descuento: discountAmount,
        shippingInfo,
      })

      const compraId =
        resCompra.data?.id_compra ||
        resCompra.data?.idCompra ||
        resCompra.data?.id ||
        'MM-' + Math.floor(1000 + Math.random() * 9000)

      setShowOtpModal(false)
      setOrderSuccess({ id_compra: compraId, metodo: 'contraentrega' })
      setShowInvoice(true)
      clearCart()
      sessionStorage.removeItem('checkout_shipping')

      toast.success('¡Compra confirmada! Factura electrónica emitida con éxito.')
    } catch (err) {
      setOtpError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Código inválido o expirado. Por favor verifica el correo e inténtalo nuevamente.'
      )
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
            <span className="step-badge active">3. Pago Seguro</span>
          </div>

          {orderSuccess ? (
            <div className="card order-success-card fade-in" style={{ marginTop: '2rem' }}>
              <div className="success-icon-wrap">
                <i className="fa fa-check-circle" />
              </div>
              <h2>¡Pedido Confirmado con Éxito!</h2>
              <p className="order-number">
                Número de Orden: <strong>#{orderSuccess.id_compra}</strong>
              </p>
              <p className="order-desc">
                Tu transacción ha sido autorizada correctamente. Hemos enviado tu <strong>factura electrónica oficial</strong> a tu correo electrónico (<strong>{user?.correo}</strong>) y los campesinos de Los Montes de María ya preparan tu pedido.
              </p>
              <div className="success-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowInvoice(true)}
                >
                  <i className="fa fa-file-invoice" /> Ver / Imprimir Factura Electrónica
                </button>
                <Link to="/perfil" className="btn btn-secondary btn-lg">
                  <i className="fa fa-receipt" /> Mis Pedidos
                </Link>
                <Link to="/" className="btn btn-outline-success btn-lg">
                  Seguir Comprando
                </Link>
              </div>
            </div>
          ) : (
            <div className="cart-layout-grid fade-in" style={{ marginTop: '2rem' }}>
              {/* Payment Methods */}
              <div className="cart-items-column">
                <div className="card">
                  <h2>
                    <i className="fa fa-shield-alt text-primary" /> Método de Pago & Seguridad
                  </h2>
                  <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                    Para tu total seguridad, cada transacción requiere un código de verificación que llegará a tu correo antes de confirmar el despacho.
                  </p>

                  {error && (
                    <div className="alert alert-danger fade-in" style={{ marginBottom: '1.5rem' }}>
                      <i className="fa fa-exclamation-circle" /> {error}
                    </div>
                  )}

                  <div className="payment-options-grid">
                    {/* Contra Entrega */}
                    <div
                      className="payment-method-card active"
                      style={{ cursor: 'default', border: '2px solid var(--primary-color)' }}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="contraentrega"
                        checked={true}
                        readOnly
                      />
                      <div className="method-icon-box">
                        <i className="fa fa-hand-holding-usd" />
                      </div>
                      <div className="method-text">
                        <strong>Pago Contra Entrega (Efectivo)</strong>
                        <span>
                          Pagas en efectivo al momento de recibir los productos en la puerta de tu casa o finca. ¡Directo del campo sin intermediarios!
                        </span>
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
                      Al hacer clic en "Confirmar y Pagar", se enviará un código de seguridad a tu correo <strong>{user?.correo || 'registrado'}</strong> para autorizar el despacho y emitir tu factura electrónica de venta.
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
                    style={{ marginTop: '1.5rem', padding: '1rem' }}
                  >
                    {sendingOtp ? (
                      <>
                        <i className="fa fa-spinner fa-spin" /> Enviando Código de Seguridad...
                      </>
                    ) : (
                      <>
                        <i className="fa fa-shield-alt" /> Confirmar y Pagar
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
            {/* Close button */}
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

            {/* Shield Icon */}
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
              <i className="fa fa-shield-alt" />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Código de Verificación
            </h3>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 1.5rem' }}>
              Hemos enviado un código de seguridad a tu correo:
              <br />
              <strong style={{ color: 'var(--text-main)', fontSize: '0.98rem' }}>{user?.correo}</strong>
            </p>

            {otpError && (
              <div
                className="alert alert-danger"
                style={{
                  marginBottom: '1.25rem',
                  fontSize: '0.88rem',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                }}
              >
                <i className="fa fa-exclamation-circle" /> {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyAndConfirmOrder}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)',
                    marginBottom: '0.6rem',
                  }}
                >
                  Ingresa el Código (6 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  placeholder="Ej: 123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    letterSpacing: '8px',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '2px solid var(--border-color)',
                    backgroundColor: 'var(--bg-main, #ffffff)',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length < 4}
                  className="btn btn-primary btn-lg"
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                  }}
                >
                  {verifyingOtp ? (
                    <>
                      <i className="fa fa-spinner fa-spin" /> Verificando y Emitiendo Factura...
                    </>
                  ) : (
                    <>
                      <i className="fa fa-check-circle" /> Verificar Código y Confirmar
                    </>
                  )}
                </button>

                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ¿No recibiste el correo?{' '}
                  {resendTimer > 0 ? (
                    <span>Reenviar en <strong>{resendTimer}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={sendingOtp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary-color, #16a34a)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Reenviar código ahora
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Factura Electrónica en Pantalla ── */}
      {showInvoice && orderSuccess && (
        <InvoiceModal
          idCompra={orderSuccess.id_compra}
          userEmail={user?.correo}
          onClose={() => setShowInvoice(false)}
        />
      )}

      <Footer />
    </>
  )
}
