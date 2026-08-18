import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function NotFoundPage() {
  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="app-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="card fade-in" style={{ maxWidth: '560px', margin: '0 auto', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '4.5rem', color: 'var(--primary)', lineHeight: 1, marginBottom: '1rem' }}>
              404
            </div>
            <h2>Página No Encontrada</h2>
            <p className="text-muted" style={{ margin: '1rem 0 2rem' }}>
              La ruta o producto que buscas no existe o ha sido movido. Regresa al catálogo para seguir explorando.
            </p>
            <Link to="/" className="btn btn-primary btn-lg">
              <i className="fa fa-home" /> Ir a la Página Principal
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
