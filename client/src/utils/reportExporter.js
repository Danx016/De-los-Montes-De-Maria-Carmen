/**
 * Módulo de Exportación de Reportes Comerciales y Financieros
 * De los Montes de María S.A.S.
 * Soporta descarga directa a Excel (CSV con formato BOM) y generación/impresión de balances en PDF.
 */

export function exportarVentasExcel(compras = [], stats = {}) {
  if (!compras || compras.length === 0) {
    alert('No hay registros de compras disponibles para exportar.')
    return
  }

  const headers = [
    'ID Compra / Factura',
    'Fecha',
    'Hora',
    'Cliente',
    'Correo',
    'Metodo de Pago',
    'Estado Pedido',
    'Cupon Aplicado',
    'Descuento ($ COP)',
    'Total Neto ($ COP)',
    'Direccion de Envio'
  ]

  const rows = compras.map((c) => {
    const f = new Date(c.fecha || Date.now())
    const fechaStr = f.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
    const horaStr = f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const totalNum = parseFloat(c.total) || 0
    const descNum = parseFloat(c.descuento) || 0

    return [
      `"${c.id_compra || c.id || ''}"`,
      `"${fechaStr}"`,
      `"${horaStr}"`,
      `"${(c.usuario_nombre || c.nombre || c.cliente || 'Cliente General').replace(/"/g, '""')}"`,
      `"${(c.usuario_correo || c.correo || '').replace(/"/g, '""')}"`,
      `"${(c.metodo_pago || 'Contra Entrega').replace(/"/g, '""')}"`,
      `"${(c.estado || 'Procesando').replace(/"/g, '""')}"`,
      `"${(c.codigo_cupon || 'Ninguno').replace(/"/g, '""')}"`,
      descNum,
      totalNum,
      `"${(c.direccion_envio || '').replace(/"/g, '""')}"`
    ].join(';')
  })

  // Calcular totales para la fila de resumen
  const granTotal = compras.reduce((acc, c) => acc + (parseFloat(c.total) || 0), 0)
  const totalDescuentos = compras.reduce((acc, c) => acc + (parseFloat(c.descuento) || 0), 0)
  const resumenRow = `\n"TOTALES CONSOLIDADOS";"";"";"";"";"";"";"Total Descuentos:";${totalDescuentos};${granTotal};""`

  // BOM UTF-8 (\uFEFF) para que Excel reconozca tildes y caracteres especiales automáticamente
  const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n') + resumenRow

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateSuffix = new Date().toISOString().split('T')[0]
  link.setAttribute('href', url)
  link.setAttribute('download', `Reporte_Ventas_MontesDeMaria_${dateSuffix}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generarReportePDF(compras = [], stats = {}) {
  const totalIngresos = compras.reduce((acc, c) => acc + (parseFloat(c.total) || 0), 0)
  const totalDescuentos = compras.reduce((acc, c) => acc + (parseFloat(c.descuento) || 0), 0)
  const promedioTicket = compras.length > 0 ? Math.round(totalIngresos / compras.length) : 0
  const fechaGeneracion = new Date().toLocaleString('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short'
  })

  const formatCOP = (val) =>
    Number(val || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    })

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes (pop-ups) en tu navegador para ver e imprimir el reporte en PDF.')
    return
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Balance y Reporte Comercial - De los Montes de María</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    }
    
    body {
      background: #f8fafc;
      color: #1e293b;
      padding: 2.5rem;
      font-size: 13px;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }

    .header-table {
      width: 100%;
      border-bottom: 2px solid #438E44;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }

    .logo-text h1 {
      font-size: 22px;
      color: #438E44;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .logo-text p {
      color: #64748b;
      font-size: 12px;
      margin-top: 2px;
    }

    .meta-box {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }

    .meta-box strong {
      color: #0f172a;
      display: block;
      font-size: 14px;
      margin-bottom: 2px;
    }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .kpi-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    .kpi-card.blue {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .kpi-card.purple {
      background: #faf5ff;
      border-color: #e9d5ff;
    }

    .kpi-card.amber {
      background: #fffbeb;
      border-color: #fde68a;
    }

    .kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      margin-top: 4px;
    }

    .kpi-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
    }

    /* Transactions Table */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }

    table.data-table th {
      background: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      border-bottom: 1.5px solid #cbd5e1;
    }

    table.data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }

    table.data-table tr:nth-child(even) {
      background: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      background: #e2e8f0;
      color: #334155;
    }

    .badge-success { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef9c3; color: #854d0e; }

    .footer-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-summary .total-box {
      text-align: right;
    }

    .total-box .grand-total {
      font-size: 22px;
      font-weight: 800;
      color: #438E44;
    }

    .print-actions {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .btn-print {
      background: #438E44;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(67, 142, 68, 0.3);
    }

    .btn-print:hover {
      background: #367337;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .report-container {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .print-actions {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="report-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle;">
          <div class="logo-text">
            <h1>DE LOS MONTES DE MARÍA S.A.S.</h1>
            <p>NIT: 1050277880 | El Carmen de Bolívar, Colombia</p>
            <p>Plataforma Agrocomercial y Mercado Campesino Directo</p>
          </div>
        </td>
        <td class="meta-box" style="vertical-align: middle;">
          <strong>BALANCE OFICIAL DE VENTAS</strong>
          <div>Emisión: ${fechaGeneracion}</div>
          <div>Total Transacciones: ${compras.length} órdenes</div>
        </td>
      </tr>
    </table>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Ingresos Totales</div>
        <div class="kpi-val" style="color: #166534;">${formatCOP(totalIngresos)}</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Total de Órdenes</div>
        <div class="kpi-val" style="color: #1e40af;">${compras.length}</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-label">Ticket Promedio</div>
        <div class="kpi-val" style="color: #6b21a8;">${formatCOP(promedioTicket)}</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Descuentos Cupones</div>
        <div class="kpi-val" style="color: #92400e;">${formatCOP(totalDescuentos)}</div>
      </div>
    </div>

    <!-- Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th># Factura</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Método de Pago</th>
          <th>Estado</th>
          <th style="text-align: right;">Total Neto</th>
        </tr>
      </thead>
      <tbody>
        ${compras.map((c) => {
          const f = new Date(c.fecha || Date.now())
          const fStr = f.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
          const isPagado = (c.estado || '').toLowerCase().includes('pagado') || (c.estado || '').toLowerCase().includes('completado')
          return `
          <tr>
            <td><strong>#${c.id_compra || c.id}</strong></td>
            <td>${fStr}</td>
            <td>${c.usuario_nombre || c.nombre || c.cliente || 'Cliente General'}</td>
            <td>${c.metodo_pago || 'Contra Entrega'}</td>
            <td>
              <span class="badge ${isPagado ? 'badge-success' : 'badge-pending'}">
                ${c.estado || 'Procesando'}
              </span>
            </td>
            <td style="text-align: right; font-weight: 700;">${formatCOP(c.total)}</td>
          </tr>
          `
        }).join('')}
      </tbody>
    </table>

    <div class="footer-summary">
      <div>
        <strong style="color: #0f172a; font-size: 13px;">Certificación Contable</strong>
        <p style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Documento generado automáticamente por el sistema de control de <strong>De los Montes de María S.A.S.</strong>
        </p>
      </div>
      <div class="total-box">
        <span style="font-size: 12px; color: #64748b; font-weight: 600;">Total Facturado:</span>
        <div class="grand-total">${formatCOP(totalIngresos)}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
