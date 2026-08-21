import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function PrivacidadPage() {
  const [activeSection, setActiveSection] = useState('responsable')

  const scrollTo = (id) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      const yOffset = -90
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content-wrap legal-page">
        {/* Header Hero */}
        <section className="legal-hero">
          <div className="app-container legal-hero-inner">
            <div className="legal-badge">
              <i className="fa fa-user-shield" /> Política de Protección de Datos (Habeas Data)
            </div>
            <h1>Política de Privacidad y Tratamiento de Datos</h1>
            <p className="legal-subtitle">
              Compromiso de Confidencialidad y Seguridad de <strong>De los Montes de María</strong>
            </p>
            <div className="legal-meta">
              <span><i className="fa fa-calendar-alt" /> Última actualización: 21 de Agosto de 2026</span>
              <span><i className="fa fa-landmark" /> Conforme a la Ley 1581 de 2012 (Colombia)</span>
              <span><i className="fa fa-shield-alt" /> Cifrado y Almacenamiento Seguro</span>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <div className="app-container legal-layout">
          {/* Sticky Sidebar Navigation */}
          <aside className="legal-sidebar">
            <div className="legal-nav-card">
              <h3>Índice de Privacidad</h3>
              <nav className="legal-nav">
                <button
                  className={activeSection === 'responsable' ? 'active' : ''}
                  onClick={() => scrollTo('responsable')}
                >
                  1. Responsable del Tratamiento
                </button>
                <button
                  className={activeSection === 'datos' ? 'active' : ''}
                  onClick={() => scrollTo('datos')}
                >
                  2. Datos que Recolectamos
                </button>
                <button
                  className={activeSection === 'finalidad' ? 'active' : ''}
                  onClick={() => scrollTo('finalidad')}
                >
                  3. Finalidad del Tratamiento
                </button>
                <button
                  className={activeSection === 'productores' ? 'active' : ''}
                  onClick={() => scrollTo('productores')}
                >
                  4. Datos de Productores y Predios
                </button>
                <button
                  className={activeSection === 'terceros' ? 'active' : ''}
                  onClick={() => scrollTo('terceros')}
                >
                  5. Pasarelas, OAuth y Terceros
                </button>
                <button
                  className={activeSection === 'seguridad' ? 'active' : ''}
                  onClick={() => scrollTo('seguridad')}
                >
                  6. Seguridad de la Información
                </button>
                <button
                  className={activeSection === 'derechos' ? 'active' : ''}
                  onClick={() => scrollTo('derechos')}
                >
                  7. Derechos del Titular (ARCO)
                </button>
                <button
                  className={activeSection === 'cookies' ? 'active' : ''}
                  onClick={() => scrollTo('cookies')}
                >
                  8. Cookies y Almacenamiento Local
                </button>
                <button
                  className={activeSection === 'canales' ? 'active' : ''}
                  onClick={() => scrollTo('canales')}
                >
                  9. Canales para Ejercer Derechos
                </button>
              </nav>

              <div className="legal-quick-actions">
                <Link to="/terminos" className="btn btn-outline-primary btn-sm btn-block">
                  <i className="fa fa-balance-scale" /> Ver Términos y Condiciones
                </Link>
                <Link to="/soporte" className="btn btn-primary btn-sm btn-block" style={{ marginTop: '0.5rem' }}>
                  <i className="fa fa-envelope" /> Ejercer Derecho Habeas Data
                </Link>
              </div>
            </div>
          </aside>

          {/* Legal Text Body */}
          <article className="legal-content">
            <div className="legal-notice-box">
              <i className="fa fa-lock legal-notice-icon" />
              <div>
                <strong>Compromiso de Privacidad:</strong> En <strong>De los Montes de María</strong> valoramos y protegemos tu privacidad. Todos los datos personales recolectados son tratados con apego a los principios de legalidad, finalidad, libertad, veracidad, transparencia y confidencialidad exigidos por la <strong>Ley Estatutaria 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013 de la República de Colombia</strong>.
              </div>
            </div>

            <section id="responsable" className="legal-section">
              <h2>1. Identificación del Responsable del Tratamiento</h2>
              <p>
                El responsable del tratamiento de tus datos personales recolectados a través del portal web, aplicaciones y canales asociados es:
              </p>
              <div className="legal-highlight-card">
                <p><strong>Razón Social / Proyecto:</strong> De los Montes de María</p>
                <p><strong>Identificación Tributaria (NIT):</strong> 1050277880</p>
                <p><strong>Ubicación Principal:</strong> El Carmen de Bolívar, Bolívar, Colombia</p>
                <p><strong>Correo Electrónico de Contacto y Privacidad:</strong> danilorodelo355@gmail.com</p>
                <p><strong>Línea Telefónica de Atención:</strong> +57 300 872 3989</p>
                <p><strong>Canal Oficial de Asistencia:</strong> Bot de Telegram @montesdemariabot</p>
              </div>
            </section>

            <section id="datos" className="legal-section">
              <h2>2. Datos Personales que Recolectamos</h2>
              <p>
                Para prestar nuestros servicios de comercio electrónico campesino y logística, recolectamos los siguientes datos según tu rol en la plataforma:
              </p>
              <ul>
                <li>
                  <strong>Datos de Registro y Autenticación:</strong> Nombre completo, nombre de usuario (apodo), correo electrónico, número de teléfono y contraseña cifrada con algoritmos criptográficos robustos (bcrypt). Si te registras a través de Google OAuth, recibimos tu nombre, correo y foto de perfil pública autorizada por ti.
                </li>
                <li>
                  <strong>Datos para Despacho y Facturación:</strong> Dirección de entrega, departamento, municipio, código postal, referencias de ubicación, nombre de la persona que recibe y teléfono de contacto.
                </li>
                <li>
                  <strong>Datos de Navegación y Transacciones:</strong> Historial de pedidos, productos agregados al carrito, comprobantes de pago, tickets de soporte generados e interacciones de consulta.
                </li>
              </ul>
            </section>

            <section id="finalidad" className="legal-section">
              <h2>3. Finalidad del Tratamiento de los Datos</h2>
              <p>
                Los datos personales recolectados tienen las siguientes finalidades legítimas y específicas:
              </p>
              <ul>
                <li><strong>Gestión de Compras y Pedidos:</strong> Procesar las órdenes de compra, coordinar el empaque en finca y gestionar el despacho logístico hasta tu domicilio o negocio.</li>
                <li><strong>Notificaciones y Estado:</strong> Enviarte confirmaciones de compra, facturas electrónicas, novedades de ruta de transporte y actualizaciones a través de correo electrónico o Telegram.</li>
                <li><strong>Servicio al Cliente y Soporte:</strong> Brindar asistencia personalizada, gestionar solicitudes de PQRS (Peticiones, Quejas, Reclamos y Sugerencias) y dar seguimiento a tickets de garantía.</li>
                <li><strong>Seguridad y Prevención del Fraude:</strong> Verificar la autenticidad de las transacciones y prevenir accesos no autorizados o conductas fraudulentas.</li>
                <li><strong>Mejora del Servicio:</strong> Desarrollar análisis estadísticos anónimos para optimizar las rutas de acopio campesino y la experiencia de usuario.</li>
              </ul>
            </section>

            <section id="productores" className="legal-section">
              <h2>4. Tratamiento Especial para Productores y Agricultores</h2>
              <p>
                En el caso de los agricultores y campesinos que comercializan cosechas mediante la plataforma:
              </p>
              <ul>
                <li>Se recopilan datos de ubicación del predio/finca, certificaciones de buenas prácticas agrícolas (cuando aplique) y datos bancarios o cuentas de billeteras digitales (Nequi, Daviplata, cuentas de ahorro) con el fin exclusivo de liquidar los pagos correspondientes a sus ventas.</li>
                <li>Los datos de contacto directo de los productores se gestionan con estricta reserva para proteger su seguridad y evitar intermediaciones indebidas.</li>
              </ul>
            </section>

            <section id="terceros" className="legal-section">
              <h2>5. Transferencia a Terceros y Pasarelas de Pago</h2>
              <p>
                <strong>De los Montes de María no vende, alquila ni comercializa bases de datos personales a terceros.</strong> Únicamente compartimos la información estrictamente necesaria con:
              </p>
              <ul>
                <li>
                  <strong>Pasarelas de Pago y Entidades Financieras:</strong> Para procesar cobros de manera segura bajo protocolos PCI-DSS. Nosotros <em>nunca</em> almacenamos los números completos de tarjetas de crédito o códigos CVV en nuestros servidores.
                </li>
                <li>
                  <strong>Empresas de Transporte y Mensajería:</strong> Únicamente los datos necesarios (nombre, teléfono y dirección de entrega) para efectuar la entrega física de los productos.
                </li>
                <li>
                  <strong>Autoridades Competentes:</strong> Cuando sea requerido formalmente mediante orden judicial o requerimiento legal fundado.
                </li>
              </ul>
            </section>

            <section id="seguridad" className="legal-section">
              <h2>6. Seguridad y Almacenamiento de la Información</h2>
              <p>
                Implementamos medidas técnicas, humanas y administrativas de vanguardia para garantizar la seguridad de los datos y evitar su adulteración, pérdida, consulta, uso o acceso no autorizado:
              </p>
              <ul>
                <li><strong>Cifrado en Tránsito (SSL/TLS):</strong> Todas las comunicaciones entre tu navegador y nuestros servidores viajan cifradas con certificados de seguridad HTTPS.</li>
                <li><strong>Cifrado de Contraseñas:</strong> Las credenciales de acceso se almacenan utilizando hash con sal irreversible (bcrypt).</li>
                <li><strong>Servidores Seguros:</strong> Infraestructura en la nube con monitoreo continuo, firewalls y políticas de respaldo periódico de bases de datos.</li>
              </ul>
            </section>

            <section id="derechos" className="legal-section">
              <h2>7. Derechos del Titular de la Información (Habeas Data)</h2>
              <p>
                De acuerdo con el artículo 8 de la Ley 1581 de 2012, como titular de los datos personales tienes derecho a:
              </p>
              <ul>
                <li><strong>Conocer, actualizar y rectificar</strong> tus datos personales frente a los responsables del tratamiento.</li>
                <li><strong>Solicitar prueba de la autorización</strong> otorgada para el tratamiento de tus datos.</li>
                <li><strong>Ser informado</strong> respecto del uso que se ha dado a tus datos personales previa solicitud.</li>
                <li><strong>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC)</strong> por infracciones a la normatividad de protección de datos.</li>
                <li><strong>Revocar la autorización y/o solicitar la supresión del dato</strong> cuando en el tratamiento no se respeten los principios, derechos y garantías constitucionales y legales.</li>
                <li><strong>Acceder en forma gratuita</strong> a tus datos personales que hayan sido objeto de tratamiento.</li>
              </ul>
            </section>

            <section id="cookies" className="legal-section">
              <h2>8. Cookies y Tecnologías de Almacenamiento Local</h2>
              <p>
                Utilizamos tecnologías estándar como cookies y <code>localStorage</code> para mantener tu sesión iniciada de manera segura, recordar los artículos agregados a tu carrito de compras, recordar tus preferencias de tema visual (modo oscuro/claro) y optimizar el rendimiento de la plataforma. Puedes configurar tu navegador para bloquear o eliminar cookies en cualquier momento, aunque esto podría limitar ciertas funciones interactivas del sitio.
              </p>
            </section>

            <section id="canales" className="legal-section">
              <h2>9. Canales para Ejercer tus Derechos de Habeas Data</h2>
              <p>
                Para consultar, actualizar, corregir o solicitar la eliminación definitiva de tus datos personales, puedes radicar tu solicitud indicando tu nombre, documento de identidad y descripción de la petición a través de:
              </p>
              <div className="legal-contact-cards">
                <div className="legal-contact-card">
                  <i className="fa fa-envelope" />
                  <strong>Correo Oficial de Datos</strong>
                  <span>danilorodelo355@gmail.com</span>
                </div>
                <div className="legal-contact-card">
                  <i className="fa fa-headset" />
                  <strong>Centro de Ayuda y PQRS</strong>
                  <Link to="/soporte" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Radicar Solicitud Web</Link>
                </div>
                <div className="legal-contact-card">
                  <i className="fab fa-telegram" style={{ color: '#229ED9' }} />
                  <strong>Asistencia Telegram</strong>
                  <span>@montesdemariabot</span>
                </div>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Toda solicitud será atendida en un plazo máximo de quince (15) días hábiles contados a partir del día siguiente a la fecha de su recibo, conforme a los términos establecidos por la legislación colombiana.
              </p>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  )
}
