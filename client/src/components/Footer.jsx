import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listarCategoriasPublicas } from '../api/productos.api'

export default function Footer() {
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    listarCategoriasPublicas()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategorias(res.data.slice(0, 6))
        }
      })
      .catch((err) => console.error('Error al cargar categorías en Footer:', err))
  }, [])

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
            <a href="https://t.me/montesdemariabot" target="_blank" rel="noreferrer" aria-label="Telegram Bot" title="Bot Oficial en Telegram" style={{ color: '#229ED9' }}><i className="fab fa-telegram" /></a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fab fa-facebook" /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fab fa-instagram" /></a>
            <a href="https://whatsapp.com" target="_blank" rel="noreferrer" aria-label="WhatsApp"><i className="fab fa-whatsapp" /></a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Categorías</h4>
          <ul>
            {categorias.length > 0 ? (
              categorias.map((cat) => {
                const slug = cat.slug || cat.nombre_categoria?.toLowerCase().replace(/\s+/g, '-')
                return (
                  <li key={cat.id_categoria || cat.id || slug}>
                    <Link to={`/categoria/${slug}`}>
                      {cat.nombre_categoria || cat.nombre}
                    </Link>
                  </li>
                )
              })
            ) : (
              <li>
                <Link to="/catalogo">Explorar Catálogo</Link>
              </li>
            )}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Enlaces Rápidos</h4>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/vendedor">Vender en la Plataforma</Link></li>
            <li><Link to="/soporte">Centro de Ayuda</Link></li>
            <li><a href="https://t.me/montesdemariabot" target="_blank" rel="noreferrer"><i className="fab fa-telegram" /> Bot de Telegram</a></li>
            <li><Link to="/carrito">Mi Carrito</Link></li>
            <li><Link to="/perfil">Mi Cuenta</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contacto & Legal</h4>
          <p><i className="fa fa-id-card" /> <strong>NIT:</strong> 1050277880</p>
          <p><i className="fab fa-telegram" style={{ color: '#229ED9' }} /> <a href="https://t.me/montesdemariabot" target="_blank" rel="noreferrer">@montesdemariabot</a></p>
          <p><i className="fa fa-phone" /> <a href="tel:3008723989">+57 300 872 3989</a></p>
          <p><i className="fa fa-envelope" /> danilorodelo355@gmail.com</p>
          <p><i className="fa fa-map-marker-alt" /> El Carmen de Bolívar, Bolívar, Colombia</p>
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
