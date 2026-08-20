import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import ProductDetailModal from './ProductDetailModal'
import { getProductImageUrl, handleProductImageError } from '../utils/productImage'

export default function ProductCard({ producto }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

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

  const imageUrl = getProductImageUrl(producto)

  const vendorId = producto.id_vendedor || producto.id_proveedor
  const prodTitle = producto.nombre || producto.nombre_producto || 'Producto Campesino'
  const isOutOfStock = Number(producto.stock || 0) === 0

  return (
    <>
      <div
        className="marketplace-product-card"
        onClick={() => setShowDetailModal(true)}
        style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      >
        {/* Product Image Container */}
        <div className="product-card-media">
          <img
            src={imageUrl}
            alt={prodTitle}
            className="product-card-img"
            onError={handleProductImageError}
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
              onClick={(e) => e.stopPropagation()}
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
        </div>
      </div>

      {/* In-depth Product Details Modal */}
      <ProductDetailModal
        producto={producto}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  )
}
