import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getProductImageUrl, handleProductImageError } from '../utils/productImage'

export default function CartPage() {
  const { items, updateQty, removeItem, clearCart, total, count } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const formatCOP = (val) =>
    Number(val || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout')
    } else {
      navigate('/checkout')
    }
  }

  return (
    <>
      <Navbar />

      <main className="main-content">
        <div className="app-container">
          <div className="cart-header-title">
            <h1><i className="fa fa-shopping-cart" /> Tu Carrito de Compras</h1>
            {count > 0 && (
              <button onClick={clearCart} className="btn-link-danger">
                <i className="fa fa-trash-alt" /> Vaciar Carrito
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="card empty-cart-card fade-in">
              <i className="fa fa-shopping-basket empty-cart-icon" />
              <h2>Tu carrito está vacío</h2>
              <p>Descubre los mejores productos del campo y apoya a nuestros campesinos.</p>
              <Link to="/" className="btn btn-primary btn-lg" style={{ marginTop: '1.25rem' }}>
                <i className="fa fa-store" /> Explorar Tienda
              </Link>
            </div>
          ) : (
            <div className="cart-layout-grid fade-in">
              {/* Items List */}
              <div className="cart-items-column">
                <div className="card cart-table-card">
                  <div className="cart-items-list">
                    {items.map((item) => {
                      const img = getProductImageUrl(item)

                      return (
                        <div key={item.id_producto} className="cart-item-row">
                          <img
                            src={img}
                            alt={item.nombre}
                            className="cart-item-image"
                            onError={handleProductImageError}
                          />

                          <div className="cart-item-info">
                            <h3>{item.nombre}</h3>
                            <span className="cart-item-cat">{item.categoria || 'Agro'}</span>
                            <span className="cart-item-unit-price">{formatCOP(item.precio)} c/u</span>
                          </div>

                          <div className="cart-item-qty-controls">
                            <button
                              onClick={() => updateQty(item.id_producto, item.cantidad - 1)}
                              className="qty-btn"
                            >
                              -
                            </button>
                            <span className="qty-val">{item.cantidad}</span>
                            <button
                              onClick={() => updateQty(item.id_producto, item.cantidad + 1)}
                              className="qty-btn"
                            >
                              +
                            </button>
                          </div>

                          <div className="cart-item-subtotal">
                            <strong>{formatCOP(item.precio * item.cantidad)}</strong>
                          </div>

                          <button
                            onClick={() => removeItem(item.id_producto)}
                            className="cart-remove-btn"
                            title="Eliminar producto"
                          >
                            <i className="fa fa-times" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="cart-summary-column">
                <div className="card cart-summary-card">
                  <h3>Resumen del Pedido</h3>
                  <hr />
                  <div className="summary-row">
                    <span>Cantidad de Productos</span>
                    <strong>{count} uds</strong>
                  </div>
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <strong>{formatCOP(total)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Costo de Envío</span>
                    <span className="text-success font-bold">Calculado en el checkout</span>
                  </div>
                  <hr />
                  <div className="summary-row total-row">
                    <span>Total Estimado</span>
                    <span className="total-price">{formatCOP(total)}</span>
                  </div>

                  <div
                    style={{
                      background: '#ecfdf5',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      margin: '1rem 0 0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: '1px dashed #059669',
                      fontSize: '0.82rem',
                      color: '#065f46',
                    }}
                  >
                    <i className="fa fa-ticket-alt" style={{ fontSize: '1rem', color: '#059669' }} />
                    <span>
                      ¿Tienes un <strong>cupón de descuento</strong>? Podrás canjearlo al confirmar tu pago.
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="btn btn-primary btn-block btn-lg"
                    style={{ marginTop: '1.5rem' }}
                  >
                    <i className="fa fa-lock" /> Proceder al Pago
                  </button>

                  <div className="secure-badge-box">
                    <i className="fa fa-shield-alt" />
                    <span>Transacciones 100% encriptadas y protegidas</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
