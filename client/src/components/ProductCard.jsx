import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductCard({ producto }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    addItem(producto, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const formatCOP = (p) => {
    return Number(p || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })
  }

  const imageUrl = producto.imagen?.startsWith('http')
    ? producto.imagen
    : producto.imagen
    ? `/uploads/${producto.imagen}`
    : '/img/Logo.jpg'

  const vendorId = producto.id_vendedor || producto.id_proveedor
  const prodTitle = producto.nombre || producto.nombre_producto || 'Producto Campesino'
  const isOutOfStock = producto.stock === 0

  return (
    <div className="marketplace-product-card">
      {/* Product Image Container */}
      <div className="product-card-media">
        <img
          src={imageUrl}
          alt={prodTitle}
          className="product-card-img"
          onError={(e) => {
            e.target.src = '/img/Logo.jpg'
          }}
          loading="lazy"
        />
        {producto.categoria && (
          <span className="product-card-category-badge">
            {producto.categoria}
          </span>
        )}
        {producto.stock <= 5 && producto.stock > 0 && (
          <span className="product-card-stock-badge warning">
            Últimas {producto.stock}
          </span>
        )}
        {isOutOfStock && (
          <span className="product-card-stock-badge danger">
            Agotado
          </span>
        )}
      </div>

      {/* Product Information Body */}
      <div className="product-card-body">
        {vendorId && (
          <Link
            to={`/vendedor/${vendorId}`}
            className="product-card-vendor"
            title={`Ver perfil de ${producto.vendedor_nombre || 'Productor Campesino'}`}
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.35rem',
              color: 'var(--primary-color, #2e7d32)',
              fontSize: '0.8rem',
              fontWeight: '600',
              lineHeight: 1.2,
              maxWidth: '100%',
            }}
          >
            {producto.vendedor_avatar ? (
              <img
                src={
                  producto.vendedor_avatar.startsWith('http')
                    ? producto.vendedor_avatar
                    : producto.vendedor_avatar.startsWith('/')
                    ? producto.vendedor_avatar
                    : `/uploads/avatars/${producto.vendedor_avatar}`
                }
                alt=""
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
            ) : (
              <i
                className="fa fa-user-check"
                style={{
                  fontSize: '0.8rem',
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {producto.vendedor_nombre || 'Productor Campesino'}
            </span>
          </Link>
        )}

        <h3 className="product-card-name" title={prodTitle}>
          {prodTitle}
        </h3>

        {producto.descripcion && (
          <p className="product-card-summary">
            {producto.descripcion.length > 70
              ? `${producto.descripcion.substring(0, 70)}...`
              : producto.descripcion}
          </p>
        )}

        {/* Card Footer: Price & Add button */}
        <div className="product-card-footer">
          <div className="product-card-pricing">
            <span className="price-tag-label">Precio</span>
            <span className="price-tag-value">{formatCOP(producto.precio)}</span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`btn-product-add ${added ? 'added' : ''}`}
            title="Agregar al carrito"
          >
            {added ? (
              <>
                <i className="fa fa-check" />
                <span>¡Agregado!</span>
              </>
            ) : (
              <>
                <i className="fa fa-shopping-cart" />
                <span>Comprar</span>
              </>
            )}
          </button>
        </div>

        {/* Telegram Direct Question */}
        <a
          href={`https://t.me/montesdemariabot?text=Hola,%20tengo%20una%20duda%20sobre%20el%20producto%20${encodeURIComponent(prodTitle)}`}
          target="_blank"
          rel="noreferrer"
          className="product-telegram-ask-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            color: '#0284c7',
            textDecoration: 'none',
            marginTop: '0.45rem',
            fontWeight: 600,
            opacity: 0.88,
          }}
          title="Consultar por Telegram"
        >
          <i className="fab fa-telegram" style={{ color: '#229ED9' }} /> ¿Dudas? Preguntar en Telegram
        </a>
      </div>
    </div>
  )
}
