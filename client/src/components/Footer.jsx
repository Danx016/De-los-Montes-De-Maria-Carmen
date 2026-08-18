import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="app-container footer-grid">
        <div className="footer-col brand-col">
          <div className="footer-brand">
            <img src="/img/Logo.jpg" alt="Logo Montes de María" className="footer-brand-img" onError={(e) => { e.target.style.display = 'none' }} />
            <h3>De los Montes de María</h3>
          </div>
          <p className="footer-desc">
            Conectando el campo directamente con tu mesa y negocio. Productos agrícolas de calidad superior, cosechados con amor en el corazón de Colombia.
          </p>
          <div className="footer-socials">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fab fa-facebook" /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fab fa-instagram" /></a>
            <a href="https://whatsapp.com" target="_blank" rel="noreferrer" aria-label="WhatsApp"><i className="fab fa-whatsapp" /></a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Categorías</h4>
          <ul>
            <li><Link to="/categoria/semillas">Semillas Certificadas</Link></li>
            <li><Link to="/categoria/lacteos">Lácteos de la Finca</Link></li>
            <li><Link to="/categoria/abonos">Abonos Orgánicos</Link></li>
            <li><Link to="/categoria/ferre">Herramientas de Campo</Link></li>
            <li><Link to="/categoria/cosechas">Cosechas del Día</Link></li>
            <li><Link to="/categoria/agro">Maquinaria Agro</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Enlaces Rápidos</h4>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/vendedor">Vender en la Plataforma</Link></li>
            <li><Link to="/soporte">Centro de Ayuda</Link></li>
            <li><Link to="/carrito">Mi Carrito</Link></li>
            <li><Link to="/perfil">Mi Cuenta</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contacto & Legal</h4>
          <p><i className="fa fa-id-card" /> <strong>NIT:</strong> 1050277880</p>
          <p><i className="fa fa-phone" /> <a href="tel:3008723989">+57 300 872 3989</a></p>
          <p><i className="fa fa-envelope" /> danilorodelo355@gmail.com</p>
          <p><i className="fa fa-map-marker-alt" /> Montes de María, Bolívar / Sucre, Colombia</p>
          <div className="payment-badges">
            <span className="badge badge-info"><i className="fa fa-shield-alt" /> Pagos Seguros Wompi & ePayco</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="app-container bottom-inner">
          <p>&copy; {new Date().getFullYear()} De los Montes de María. Todos los derechos reservados.</p>
          <div className="legal-links">
            <Link to="/soporte">Términos & Condiciones</Link>
            <Link to="/soporte">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
