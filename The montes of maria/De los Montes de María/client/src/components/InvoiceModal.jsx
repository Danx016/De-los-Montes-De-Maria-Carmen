import { useState, useEffect, useRef } from 'react'
import { obtenerRecibo, enviarReciboCorreo } from '../api/compras.api'
import { useToast } from '../context/ToastContext'

const formatCOP = (val) =>
  Number(val || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusColor = (estado) => {
  switch ((estado || '').toLowerCase()) {
    case 'entregado':
      return { bg: '#dcfce7', color: '#15803d', label: 'Entregado' }
    case 'cancelado':
      return { bg: '#fee2e2', color: '#dc2626', label: 'Cancelado' }
    case 'en_proceso':
    case 'en proceso':
      return { bg: '#fef3c7', color: '#d97706', label: 'En Proceso' }
    default:
      return { bg: '#dbeafe', color: '#2563eb', label: estado || 'Confirmado' }
  }
}

export default function InvoiceModal({ idCompra, onClose, userEmail }) {
  const toast = useToast()
  const [recibo, setRecibo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const printRef = useRef()

  useEffect(() => {
    if (!idCompra) return
    setLoading(true)
    obtenerRecibo(idCompra)
      .then((res) => setRecibo(res.data))
      .catch(() => toast.error('No se pudo cargar la factura electrónica.'))
      .finally(() => setLoading(false))
  }, [idCompra])

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSendEmail = async () => {
    setSending(true)
    try {
      await enviarReciboCorreo({ idCompra, email: userEmail || recibo?.correo_cliente })
      toast.success('¡Factura electrónica enviada a tu correo con éxito!')
    } catch {
      toast.error('Error al enviar la factura por correo.')
    } finally {
      setSending(false)
    }
  }

  const handlePrint = () => {
    if (!recibo) return
    const win = window.open('', '_blank', 'width=880,height=960')
    const origin = window.location.origin
    const totalVal = parseFloat(recibo.total) || 0
    const items = recibo.detalles || []
    const subtotalCalc = items.reduce((acc, item) => acc + (parseFloat(item.precio_unitario) || 0) * (Number(item.cantidad) || 1), 0)
    const statusObj = getStatusColor(recibo.estado)

    const itemsRowsHtml = items.map((item, idx) => {
      const cant = Number(item.cantidad) || 1
      const precio = parseFloat(item.precio_unitario) || 0
      const subtotal = cant * precio
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">
            ${item.nombre_producto || item.nombre || 'Producto Campesino'}
            ${item.presentacion ? `<br/><span style="font-size: 11px; color: #64748b; font-weight: normal;">Presentación: ${item.presentacion}</span>` : ''}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; text-align: center;">${cant}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; text-align: right;">$${precio.toLocaleString('es-CO')}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #166534; font-weight: 700; text-align: right;">$${subtotal.toLocaleString('es-CO')}</td>
        </tr>
      `
    }).join('')

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <base href="${origin}/" />
        <title>Factura Electrónica #${recibo.id_compra} — DE LOS MONTES DE MARÍA S.A.S</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&family=Open+Sans:wght@400;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Open Sans', sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
          .inv-header { background: linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%); color: #fff; padding: 28px 32px; }
          .inv-header-top { display: flex; justify-content: space-between; align-items: center; }
          .inv-brand { display: flex; align-items: center; gap: 14px; }
          .inv-logo-box { width: 75px; height: 75px; background: #ffffff; border-radius: 12px; padding: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); flex-shrink: 0; }
          .inv-logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .inv-brand-info h1 { font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; margin: 0 0 2px 0; color: #ffffff; }
          .inv-brand-info p { font-size: 11.5px; color: #d1fae5; margin: 0; line-height: 1.4; }
          .inv-num-box { text-align: right; background: rgba(255,255,255,0.12); padding: 12px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.25); }
          .inv-num-lbl { font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: #86efac; }
          .inv-num { font-family: 'Montserrat', sans-serif; font-size: 22px; font-weight: 900; color: #fff; }
          .inv-meta-bar { display: flex; gap: 24px; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2); flex-wrap: wrap; }
          .inv-meta-cell { font-size: 12px; color: #e2e8f0; }
          .inv-meta-cell strong { display: block; color: #ffffff; font-size: 13px; font-weight: 700; margin-bottom: 2px; }
          .inv-body { padding: 30px 32px; }
          .inv-entities { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .inv-entity-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; }
          .inv-entity-tag { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #166534; margin-bottom: 6px; }
          .inv-entity-name { font-family: 'Montserrat', sans-serif; font-size: 14.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
          .inv-entity-lines { font-size: 12.5px; color: #475569; line-height: 1.6; }
          table.inv-tbl { width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          table.inv-tbl thead th { background: #14532d; color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; padding: 12px 14px; text-align: left; }
          .inv-summary-section { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-top: 16px; flex-wrap: wrap; }
          .inv-qr-card { flex: 1; min-width: 260px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 11.5px; color: #64748b; line-height: 1.5; }
          .inv-totals-card { width: 300px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 18px; }
          .inv-tot-line { display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 8px; }
          .inv-tot-line.grand { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 16px; color: #14532d; border-top: 2px solid #16a34a; padding-top: 10px; margin-top: 8px; margin-bottom: 0; }
          .inv-footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
          @media print {
            body { padding: 0; background: #ffffff; }
            .invoice-card { box-shadow: none; border: none; border-radius: 0; max-width: 100%; }
            @page { size: auto; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <!-- Header -->
          <div class="inv-header">
            <div class="inv-header-top">
              <div class="inv-brand">
                <div class="inv-logo-box">
                  <img src="${origin}/img/Logo.jpg" alt="Logo" onerror="this.src='${origin}/img/logo%20vaca.png'" />
                </div>
                <div class="inv-brand-info">
                  <h1>DE LOS MONTES DE MARÍA S.A.S</h1>
                  <p>NIT: 1050277880 • Tel: 3008723989</p>
                  <p>Montes de María, Bolívar / Sucre, Colombia • agrocampo.co</p>
                </div>
              </div>
              <div class="inv-num-box">
                <div class="inv-num-lbl">Factura Electrónica</div>
                <div class="inv-num">#${recibo.id_compra}</div>
              </div>
            </div>

            <div class="inv-meta-bar">
              <div class="inv-meta-cell">
                <span>Fecha de Emisión:</span>
                <strong>${formatDate(recibo.fecha)}</strong>
              </div>
              <div class="inv-meta-cell">
                <span>Método de Pago:</span>
                <strong>${recibo.metodo_pago || 'Contra Entrega'}</strong>
              </div>
              <div class="inv-meta-cell">
                <span>Estado de Orden:</span>
                <strong>${statusObj.label}</strong>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="inv-body">
            <!-- Entities -->
            <div class="inv-entities">
              <div class="inv-entity-card">
                <div class="inv-entity-tag">Datos del Emisor</div>
                <div class="inv-entity-name">DE LOS MONTES DE MARÍA S.A.S</div>
                <div class="inv-entity-lines">
                  <strong>NIT:</strong> 1050277880<br/>
                  <strong>Tel / WhatsApp:</strong> +57 300 872 3989<br/>
                  <strong>Email:</strong> danilorodelo355@gmail.com<br/>
                  <strong>Sede:</strong> Montes de María, Colombia
                </div>
              </div>

              <div class="inv-entity-card">
                <div class="inv-entity-tag">Adquirente / Facturado A</div>
                <div class="inv-entity-name">${recibo.nombre_cliente || 'Cliente'}</div>
                <div class="inv-entity-lines">
                  ${recibo.correo_cliente ? `<strong>Email:</strong> ${recibo.correo_cliente}<br/>` : ''}
                  <strong>Dirección de Envío:</strong> ${recibo.direccion_envio || 'Montes de María, Colombia'}<br/>
                  <strong>Comprobante:</strong> Orden Oficial de Compra
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <table class="inv-tbl">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th>Descripción del Producto</th>
                  <th style="width: 70px; text-align: center;">Cant.</th>
                  <th style="width: 120px; text-align: right;">Precio Unit.</th>
                  <th style="width: 130px; text-align: right;">Total ($COP)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>

            <!-- Summary & QR info -->
            <div class="inv-summary-section">
              <div class="inv-qr-card">
                <p style="font-weight: 700; color: #166534; margin-bottom: 4px;">✅ Factura Electrónica Oficial y Válida</p>
                <p style="margin-bottom: 6px;">Documento generado electrónicamente de conformidad con las políticas de facturación digital de <strong>DE LOS MONTES DE MARÍA S.A.S.</strong></p>
                <p style="font-size: 10.5px; color: #94a3b8; font-family: monospace;">CUFE: MM-${recibo.id_compra}-2026-NIT1050277880-AGROCAMPO</p>
              </div>

              <div class="inv-totals-card">
                <div class="inv-tot-line">
                  <span>Subtotal Productos:</span>
                  <strong>$${subtotalCalc.toLocaleString('es-CO')}</strong>
                </div>
                <div class="inv-tot-line">
                  <span>Despacho / Envío:</span>
                  <span>Incluido</span>
                </div>
                <div class="inv-tot-line grand">
                  <span>Total Pagado:</span>
                  <span>$${totalVal.toLocaleString('es-CO')} COP</span>
                </div>
              </div>
            </div>

            <!-- Legal Footer -->
            <div class="inv-footer">
              <p>DE LOS MONTES DE MARÍA S.A.S. • NIT: 1050277880 • Tel: 3008723989</p>
              <p>San Jacinto • El Carmen de Bolívar • María La Baja • Ovejas • San Juan Nepomuceno</p>
              <p>Gracias por apoyar el trabajo campesino y la soberanía alimentaria de nuestra región.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
    }, 450)
  }

  const status = getStatusColor(recibo?.estado)

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header bar */}
        <div className="invoice-modal-bar">
          <div className="invoice-modal-bar-title">
            <i className="fa fa-file-invoice" />
            <span>Factura Electrónica Oficial</span>
          </div>
          <div className="invoice-modal-bar-actions">
            <button
              type="button"
              className="inv-action-btn inv-btn-email"
              onClick={handleSendEmail}
              disabled={sending || loading || !recibo}
              title="Enviar factura por correo"
            >
              {sending ? <i className="fa fa-spinner fa-spin" /> : <i className="fa fa-envelope" />}
              <span>{sending ? 'Enviando...' : 'Enviar al correo'}</span>
            </button>
            <button
              type="button"
              className="inv-action-btn inv-btn-print"
              onClick={handlePrint}
              disabled={loading || !recibo}
              title="Imprimir o guardar como PDF"
            >
              <i className="fa fa-print" />
              <span>Imprimir / PDF</span>
            </button>
            <button type="button" className="inv-close-btn" onClick={onClose} title="Cerrar">
              <i className="fa fa-times" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="invoice-modal-body">
          {loading ? (
            <div className="invoice-loading">
              <div className="spinner" />
              <p>Cargando factura electrónica...</p>
            </div>
          ) : !recibo ? (
            <div className="invoice-loading">
              <i className="fa fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#dc2626' }} />
              <p>No se encontró la factura.</p>
            </div>
          ) : (
            <div className="invoice-printable" ref={printRef}>
              {/* Invoice Head */}
              <div className="inv-head">
                <div className="inv-head-top">
                  <div className="inv-brand">
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src="/img/Logo.jpg"
                        alt="Logo De los Montes de María"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.src = '/img/logo vaca.png'
                        }}
                      />
                    </div>
                    <div className="inv-brand-text">
                      <div className="inv-brand-name">DE LOS MONTES DE MARÍA S.A.S</div>
                      <div className="inv-brand-sub">NIT: 1050277880 • Tel: 3008723989 • agrocampo.co</div>
                    </div>
                  </div>
                  <div className="inv-number-box">
                    <div className="inv-number-label">Factura N°</div>
                    <div className="inv-number">#{recibo.id_compra}</div>
                  </div>
                </div>

                <div className="inv-meta">
                  <div className="inv-meta-item">
                    <strong>Fecha de emisión</strong>
                    {formatDate(recibo.fecha)}
                  </div>
                  <div className="inv-meta-item">
                    <strong>Método de pago</strong>
                    {recibo.metodo_pago || 'Contra Entrega'}
                  </div>
                  <div className="inv-meta-item">
                    <strong>Estado</strong>
                    <span
                      className="badge-status"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="inv-body">
                {/* Parties */}
                <div className="inv-parties">
                  <div className="inv-party">
                    <div className="inv-party-label">Emisor</div>
                    <div className="inv-party-name">DE LOS MONTES DE MARÍA S.A.S</div>
                    <div className="inv-party-detail">
                      <strong>NIT:</strong> 1050277880<br />
                      <strong>Tel / WhatsApp:</strong> +57 300 872 3989<br />
                      <strong>Email:</strong> danilorodelo355@gmail.com<br />
                      Montes de María, Bolívar / Sucre, Colombia
                    </div>
                  </div>
                  <div className="inv-party">
                    <div className="inv-party-label">Adquirente / Facturado a</div>
                    <div className="inv-party-name">{recibo.nombre_cliente || 'Cliente'}</div>
                    <div className="inv-party-detail">
                      {recibo.correo_cliente && <><strong>Email:</strong> {recibo.correo_cliente}<br /></>}
                      <strong>Dirección:</strong> {recibo.direccion_envio || 'Montes de María, Colombia'}
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Producto</th>
                      <th>Presentación</th>
                      <th className="text-right">Cantidad</th>
                      <th className="text-right">Precio Unit.</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recibo.detalles || []).map((item, i) => (
                      <tr key={item.id_detalle || i}>
                        <td className="inv-idx">{i + 1}</td>
                        <td className="inv-product-name">{item.nombre_producto || item.nombre || 'Producto Campesino'}</td>
                        <td>{item.presentacion || 'Unidad'}</td>
                        <td className="text-right">{item.cantidad}</td>
                        <td className="text-right">{formatCOP(item.precio_unitario)}</td>
                        <td className="text-right inv-subtotal">
                          {formatCOP((item.precio_unitario || 0) * (item.cantidad || 1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="inv-totals-wrap">
                  <div className="inv-totals-box">
                    <div className="inv-totals-row">
                      <span>Subtotal productos</span>
                      <span>
                        {formatCOP(
                          (recibo.detalles || []).reduce(
                            (s, d) => s + (d.precio_unitario || 0) * (d.cantidad || 1),
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="inv-totals-row">
                      <span>Envío / Despacho</span>
                      <span>Incluido</span>
                    </div>
                    <div className="inv-totals-row grand">
                      <span>Total a pagar</span>
                      <span>{formatCOP(recibo.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer note */}
                <div className="inv-footer-note">
                  <i className="fa fa-shield-alt" style={{ color: 'var(--primary-color)' }} />
                  <span>
                    Factura electrónica oficial emitida por <strong>DE LOS MONTES DE MARÍA S.A.S.</strong> (NIT: 1050277880). Teléfono de soporte: <strong>3008723989</strong>. · {formatDate(recibo.fecha)}
                  </span>
                </div>

                {/* Bottom Close Button */}
                <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                    style={{ borderRadius: '999px', padding: '0.65rem 2rem', fontWeight: 700, fontSize: '0.92rem' }}
                  >
                    <i className="fa fa-times" style={{ marginRight: '0.4rem' }} /> Cerrar Factura
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
