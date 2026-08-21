import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function TerminosPage() {
  const [activeSection, setActiveSection] = useState('introduccion')

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
              <i className="fa fa-balance-scale" /> Marco Legal y Operativo
            </div>
            <h1>Términos y Condiciones de Uso</h1>
            <p className="legal-subtitle">
              Plataforma Agrocomercial y Marketplace <strong>De los Montes de María</strong>
            </p>
            <div className="legal-meta">
              <span><i className="fa fa-calendar-alt" /> Última actualización: 21 de Agosto de 2026</span>
              <span><i className="fa fa-map-marker-alt" /> El Carmen de Bolívar, Colombia</span>
              <span><i className="fa fa-id-card" /> NIT: 1050277880</span>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <div className="app-container legal-layout">
          {/* Sticky Sidebar Navigation */}
          <aside className="legal-sidebar">
            <div className="legal-nav-card">
              <h3>Índice de Secciones</h3>
              <nav className="legal-nav">
                <button
                  className={activeSection === 'introduccion' ? 'active' : ''}
                  onClick={() => scrollTo('introduccion')}
                >
                  1. Introducción y Objeto
                </button>
                <button
                  className={activeSection === 'definiciones' ? 'active' : ''}
                  onClick={() => scrollTo('definiciones')}
                >
                  2. Definiciones
                </button>
                <button
                  className={activeSection === 'cuentas' ? 'active' : ''}
                  onClick={() => scrollTo('cuentas')}
                >
                  3. Registro y Cuentas de Usuario
                </button>
                <button
                  className={activeSection === 'vendedores' ? 'active' : ''}
                  onClick={() => scrollTo('vendedores')}
                >
                  4. Productores y Vendedores Agrícolas
                </button>
                <button
                  className={activeSection === 'productos' ? 'active' : ''}
                  onClick={() => scrollTo('productos')}
                >
                  5. Catálogo, Calidad y Precios
                </button>
                <button
                  className={activeSection === 'pagos' ? 'active' : ''}
                  onClick={() => scrollTo('pagos')}
                >
                  6. Transacciones y Métodos de Pago
                </button>
                <button
                  className={activeSection === 'envios' ? 'active' : ''}
                  onClick={() => scrollTo('envios')}
                >
                  7. Logística, Envíos y Entregas
                </button>
                <button
                  className={activeSection === 'devoluciones' ? 'active' : ''}
                  onClick={() => scrollTo('devoluciones')}
                >
                  8. Perecederos, Devoluciones y Garantías
                </button>
                <button
                  className={activeSection === 'ia-soporte' ? 'active' : ''}
                  onClick={() => scrollTo('ia-soporte')}
                >
                  9. Asistente IA, Telegram y Soporte
                </button>
                <button
                  className={activeSection === 'propiedad' ? 'active' : ''}
                  onClick={() => scrollTo('propiedad')}
                >
                  10. Propiedad Intelectual
                </button>
                <button
                  className={activeSection === 'legislacion' ? 'active' : ''}
                  onClick={() => scrollTo('legislacion')}
                >
                  11. Ley Aplicable y Jurisdicción
                </button>
              </nav>

              <div className="legal-quick-actions">
                <Link to="/privacidad" className="btn btn-outline-primary btn-sm btn-block">
                  <i className="fa fa-shield-alt" /> Ver Política de Privacidad
                </Link>
                <Link to="/soporte" className="btn btn-primary btn-sm btn-block" style={{ marginTop: '0.5rem' }}>
                  <i className="fa fa-headset" /> Contactar a Soporte
                </Link>
              </div>
            </div>
          </aside>

          {/* Legal Text Body */}
          <article className="legal-content">
            <div className="legal-notice-box">
              <i className="fa fa-info-circle legal-notice-icon" />
              <div>
                <strong>Aviso Importante:</strong> Al registrarte, navegar o realizar compras a través de la plataforma <strong>De los Montes de María</strong>, confirmas haber leído, entendido y aceptado de manera voluntaria los presentes Términos y Condiciones en su totalidad, así como nuestra <Link to="/privacidad" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'underline' }}>Política de Privacidad y Tratamiento de Datos</Link>.
              </div>
            </div>

            <section id="introduccion" className="legal-section">
              <h2>1. Introducción y Objeto de la Plataforma</h2>
              <p>
                <strong>De los Montes de María</strong> es un ecosistema digital, marketplace y plataforma logística creada con el propósito de conectar de forma directa y transparente a productores, campesinos, asociaciones agrícolas y cooperativas de la subregión de los <strong>Montes de María</strong> (departamentos de Bolívar y Sucre, Colombia) con compradores finales, restaurantes, comercializadores y distribuidores a nivel regional y nacional.
              </p>
              <p>
                La plataforma facilita la exhibición, comercialización, trazabilidad, pago electrónico y coordinación logística de productos agrícolas frescos (como aguacate, ñame, plátano, yuca, cacao, miel, frutas y derivados artesanales), eliminando intermediarios abusivos y garantizando pagos justos y directos al productor.
              </p>
            </section>

            <section id="definiciones" className="legal-section">
              <h2>2. Definiciones</h2>
              <ul>
                <li>
                  <strong>Plataforma:</strong> El sitio web, aplicaciones móviles, servicios de API y canales automatizados (incluyendo el bot oficial de Telegram) operados por <em>De los Montes de María</em>.
                </li>
                <li>
                  <strong>Usuario / Comprador:</strong> Cualquier persona natural o jurídica que accede al catálogo, realiza cotizaciones, compras o solicitudes de entrega de productos agrícolas.
                </li>
                <li>
                  <strong>Productor / Vendedor:</strong> Agricultor, campesino, emprendedor rural o asociación registrada y verificada que ofrece cosechas y productos mediante la plataforma.
                </li>
                <li>
                  <strong>Asistente IA y Bot:</strong> Sistema automatizado con inteligencia artificial y sincronización omnicanal (web y Telegram) encargado de asistencia, orientación técnica y gestión de tickets.
                </li>
                <li>
                  <strong>Orden de Compra:</strong> Acuerdo contractual generado electrónicamente cuando un Comprador confirma el pedido de una o varias referencias ofrecidas.
                </li>
              </ul>
            </section>

            <section id="cuentas" className="legal-section">
              <h2>3. Registro y Cuentas de Usuario</h2>
              <p>
                Para acceder a ciertas funcionalidades de la plataforma (como realizar pedidos, acumular historial de compras o gestionar productos como vendedor), el usuario debe crear una cuenta personal proporcionando información veraz, actualizada y completa.
              </p>
              <ul>
                <li>El usuario es responsable de mantener la confidencialidad de su contraseña e información de acceso.</li>
                <li>Queda prohibida la suplantación de identidad o el suministro de información falsa, engañosa o no autorizada.</li>
                <li>La plataforma se reserva el derecho de suspender o revocar el acceso a cuentas que incurran en fraudes, abusos en pedidos o conductas desleales con los productores locales.</li>
              </ul>
            </section>

            <section id="vendedores" className="legal-section">
              <h2>4. Productores y Vendedores Agrícolas</h2>
              <p>
                Los productores campesinos que se vinculen a la plataforma deben superar un proceso de verificación que garantice el origen lícito, la trazabilidad de sus cultivos y la ubicación de sus predios en la región de los Montes de María.
              </p>
              <ul>
                <li>Los vendedores se comprometen a suministrar información verídica respecto al estado, peso, calibre y fecha estimada de cosecha de sus productos.</li>
                <li>Los vendedores deben cumplir con las buenas prácticas agrícolas y fitosanitarias exigidas por las autoridades colombianas (ICA, Invima, según aplique).</li>
                <li>La plataforma proporciona a los agricultores tableros de control de ventas, estadísticas y herramientas de comunicación para agilizar sus despachos.</li>
              </ul>
            </section>

            <section id="productos" className="legal-section">
              <h2>5. Catálogo, Calidad y Precios</h2>
              <p>
                Todos los productos mostrados en la plataforma cuentan con descripciones, fotografías reales o ilustrativas, especificación de peso/unidad y precios expresados en <strong>Pesos Colombianos (COP)</strong>.
              </p>
              <ul>
                <li>
                  <strong>Naturaleza Perecedera:</strong> Por tratarse de productos del campo cosechados artesanalmente, pueden existir variaciones naturales mínimas en color, tamaño y forma entre los ejemplares entregados y las fotografías ilustrativas.
                </li>
                <li>
                  <strong>Disponibilidad y Temporadas:</strong> La oferta de cosechas depende del ciclo agrícola y condiciones climáticas de la región montemariana. En caso de agotamiento imprevisto de una cosecha posterior a la orden, se coordinará la sustitución de mutuo acuerdo o el reembolso inmediato al cliente.
                </li>
                <li>
                  <strong>Precios Transparentes:</strong> Los precios publicados incluyen los valores correspondientes al producto. Los costos de transporte o domicilio se discriminan de manera clara antes del pago final.
                </li>
              </ul>
            </section>

            <section id="pagos" className="legal-section">
              <h2>6. Transacciones y Métodos de Pago</h2>
              <p>
                La plataforma implementa estándares de seguridad bancaria y procesamiento cifrado a través de pasarelas de pago certificadas:
              </p>
              <ul>
                <li><strong>Métodos Electrónicos:</strong> PSE (Cuentas de Ahorro y Corriente), Tarjetas de Crédito/Débito (Visa, Mastercard, American Express), Nequi y Daviplata.</li>
                <li><strong>Pago Contra Entrega / En Efectivo:</strong> Sujeto a cobertura logística y validación previa de la dirección de entrega en las zonas habilitadas.</li>
                <li>Los fondos recaudados son distribuidos conforme a los acuerdos de comercio justo pactados con cada productor.</li>
              </ul>
            </section>

            <section id="envios" className="legal-section">
              <h2>7. Logística, Envíos y Entregas</h2>
              <p>
                Los despachos se realizan directamente desde los centros de acopio y fincas de los Montes de María hacia las rutas municipales y ciudades de destino:
              </p>
              <ul>
                <li>El Comprador es responsable de suministrar una dirección exacta, datos de contacto vigentes e indicaciones especiales de entrega.</li>
                <li>Los tiempos de entrega estimados se informan durante el proceso de compra y pueden variar según la distancia, estado de vías rurales y condiciones climáticas.</li>
                <li>En caso de no encontrar a nadie en la dirección indicada tras los intentos de entrega programados, se coordinará una reprogramación sujeta a los términos de transporte.</li>
              </ul>
            </section>

            <section id="devoluciones" className="legal-section">
              <h2>8. Perecederos, Devoluciones y Garantías</h2>
              <p>
                De acuerdo con la <strong>Ley 1480 de 2011 (Estatuto del Consumidor en Colombia)</strong> y las características particulares de los bienes agrícolas perecederos:
              </p>
              <ul>
                <li>
                  <strong>Reporte de Novedades:</strong> Debido a que se trata de alimentos frescos perecederos, cualquier anomalía en calidad, madurez excesiva o daño por transporte debe ser reportada dentro de las <strong>24 horas siguientes a la recepción</strong> adjuntando fotografía o video soporte a través del módulo de Soporte o al bot de Telegram.
                </li>
                <li>
                  <strong>Garantía y Reposición:</strong> Comprobada la falla o deterioro en el producto, la plataforma gestionará la reposición en el siguiente despacho o el reembolso correspondiente sin costo adicional para el comprador.
                </li>
                <li>
                  <strong>Derecho de Retracto:</strong> De conformidad con el artículo 47 de la Ley 1480 de 2011, se exceptúan del derecho de retracto los bienes que por su naturaleza sean perecederos o susceptibles de deteriorarse con rapidez.
                </li>
              </ul>
            </section>

            <section id="ia-soporte" className="legal-section">
              <h2>9. Asistente IA, Telegram y Soporte al Cliente</h2>
              <p>
                La plataforma pone a disposición de sus usuarios canales automatizados y presenciales de atención:
              </p>
              <ul>
                <li>
                  <strong>Asistente Virtual con Inteligencia Artificial:</strong> Orienta a los usuarios en consultas generales, estado de pedidos y recomendaciones de recetas. Sus respuestas son informativas y no sustituyen dictámenes agronómicos o contractuales oficiales.
                </li>
                <li>
                  <strong>Escalamiento Humano:</strong> Cualquier inconformidad o solicitud formal puede ser escalada a agentes humanos a través del sistema de tickets integrado o mediante la línea directa de atención.
                </li>
                <li>
                  <strong>Canal de Telegram:</strong> El bot oficial <code>@montesdemariabot</code> permite consultar el estado de pedidos y recibir novedades de cosechas de manera segura.
                </li>
              </ul>
            </section>

            <section id="propiedad" className="legal-section">
              <h2>10. Propiedad Intelectual</h2>
              <p>
                Los elementos distintivos, marcas, logotipos, diseños, código fuente, fotografías originales de agricultores, textos y estructura del portal son propiedad exclusiva de <strong>De los Montes de María</strong> o cuentan con las debidas licencias y autorizaciones. Queda prohibida su reproducción no autorizada con fines comerciales ajenos al objeto de la plataforma.
              </p>
            </section>

            <section id="legislacion" className="legal-section">
              <h2>11. Ley Aplicable y Jurisdicción</h2>
              <p>
                Los presentes Términos y Condiciones se rigen e interpretan de conformidad con las leyes de la <strong>República de Colombia</strong> (Ley 527 de 1999 sobre Comercio Electrónico, Ley 1480 de 2011 Estatuto del Consumidor, y normatividad complementaria). Para cualquier controversia no resuelta por vía directa, las partes se someterán a los jueces de la jurisdicción ordinaria colombiana.
              </p>
            </section>

            <div className="legal-contact-footer">
              <h3>¿Tienes dudas sobre nuestros Términos y Condiciones?</h3>
              <p>Nuestro equipo de atención y asesoría legal campesina está disponible para asistirte.</p>
              <div className="legal-contact-cards">
                <div className="legal-contact-card">
                  <i className="fa fa-envelope" />
                  <strong>Correo Electrónico</strong>
                  <span>danilorodelo355@gmail.com</span>
                </div>
                <div className="legal-contact-card">
                  <i className="fa fa-phone-alt" />
                  <strong>Línea de Atención</strong>
                  <span>+57 300 872 3989</span>
                </div>
                <div className="legal-contact-card">
                  <i className="fab fa-telegram" style={{ color: '#229ED9' }} />
                  <strong>Bot de Telegram</strong>
                  <span>@montesdemariabot</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  )
}
