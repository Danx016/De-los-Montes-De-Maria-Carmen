import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { getProductImageUrl, handleProductImageError } from '../utils/productImage'

export default function ProductDetailModal({ producto, isOpen, onClose }) {
  const { addItem } = useCart()
  const [cantidad, setCantidad] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setCantidad(1)
    setAdded(false)
  }, [producto])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !producto) return null

  const formatCOP = (p) => {
    return Number(p || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })
  }

  const imageUrl = getProductImageUrl(producto)

  const vendorId = producto.id_vendedor || producto.id_proveedor
  const prodTitle = producto.nombre || producto.nombre_producto || 'Cosecha Campesina'
  const isOutOfStock = Number(producto.stock || 0) <= 0
  const maxStock = Number(producto.stock || 99)

  const handleAddToCart = () => {
    if (isOutOfStock) return
    addItem(producto, cantidad)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleIncrement = () => {
    if (cantidad < maxStock) setCantidad((prev) => prev + 1)
  }

  const handleDecrement = () => {
    if (cantidad > 1) setCantidad((prev) => prev - 1)
  }

  const origenText = producto.origen || 'Montes de María (Bolívar / Sucre), Colombia'
  const presentacionText = producto.presentacion || (producto.unidad_medida ? `Por ${producto.unidad_medida}` : 'Empaque fresco de finca')
  const cuidadoText = producto.cuidado || 'Conservar en un lugar fresco, seco y protegido de la luz directa.'
  const unidadText = producto.unidad_medida || 'Unidad / Pieza'

  return (
    <div
      className="modal-overlay fade-in"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 0,
          borderRadius: '24px',
          background: '#ffffff',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            color: '#475569',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.color = '#0f172a'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.color = '#475569'
          }}
        >
          <i className="fa fa-times" />
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0 }}>
          {/* Left Column: Image & Badges */}
          <div
            style={{
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              borderRight: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '100%',
                maxHeight: '340px',
                aspectRatio: '1/1',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={imageUrl}
                alt={prodTitle}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.4s ease',
                }}
                onError={handleProductImageError}
              />
            </div>

            {/* Badges bar */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem', justifyContent: 'center' }}>
              {producto.categoria && (
                <span
                  style={{
                    background: '#15803d',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                  }}
                >
                  <i className="fa fa-tag" /> {producto.categoria}
                </span>
              )}
              <span
                style={{
                  background: isOutOfStock ? '#fee2e2' : producto.stock <= 5 ? '#fef3c7' : '#dcfce7',
                  color: isOutOfStock ? '#991b1b' : producto.stock <= 5 ? '#92400e' : '#166534',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  border: `1px solid ${isOutOfStock ? '#fecaca' : producto.stock <= 5 ? '#fde68a' : '#bbf7d0'}`,
                }}
              >
                <i className={`fa ${isOutOfStock ? 'fa-ban' : 'fa-cubes'}`} />{' '}
                {isOutOfStock ? 'Agotado' : `${producto.stock} ${unidadText} disponibles`}
              </span>
            </div>
          </div>

          {/* Right Column: Detailed Product Info */}
          <div style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column' }}>
            {/* Farmer / Producer Header Banner */}
            {vendorId && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '14px',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {producto.vendedor_avatar ? (
                    <img
                      src={
                        producto.vendedor_avatar.startsWith('http')
                          ? producto.vendedor_avatar
                          : producto.vendedor_avatar.startsWith('/')
                          ? producto.vendedor_avatar
                          : `/uploads/avatars/${producto.vendedor_avatar}`
                      }
                      alt={producto.vendedor_nombre || 'Productor'}
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e' }}
                    />
                  ) : (
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      👨‍🌾
                    </div>
                  )}
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Cultivado por</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      {producto.vendedor_nombre || 'Campesino de Montes de María'}
                    </strong>
                  </div>
                </div>

                <Link
                  to={`/vendedor/${vendorId}`}
                  onClick={onClose}
                  className="btn btn-sm btn-outline-primary"
                  style={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: '999px', padding: '0.3rem 0.75rem' }}
                >
                  <i className="fa fa-store" /> Ver Finca
                </Link>
              </div>
            )}

            {/* Product Title & Price */}
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem 0', lineHeight: 1.25 }}>
              {prodTitle}
            </h2>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d' }}>
                {formatCOP(producto.precio)}
              </span>
              <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
                / {unidadText}
              </span>
            </div>

            {/* Full In-Depth Description */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.35rem 0' }}>
                Descripción del Producto
              </h4>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.55 }}>
                {producto.descripcion || 'Producto 100% fresco, cultivado con amor y dedicación por familias campesinas en las fértiles tierras de los Montes de María.'}
              </p>
            </div>

            {/* In-depth Technical Specs Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <i className="fa fa-map-marker-alt text-danger" /> Origen de Cosecha
                </span>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block', marginTop: '0.15rem' }}>
                  {origenText}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <i className="fa fa-box text-primary" /> Presentación
                </span>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block', marginTop: '0.15rem' }}>
                  {presentacionText}
                </strong>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <i className="fa fa-leaf text-success" /> Cuidados & Conservación
                </span>
                <span style={{ fontSize: '0.82rem', color: '#334155', display: 'block', marginTop: '0.15rem' }}>
                  {cuidadoText}
                </span>
              </div>
            </div>

            {/* Quantity Selector & Add to Cart Button */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {/* Quantity Controls */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid #cbd5e1',
                    borderRadius: '999px',
                    background: '#ffffff',
                    padding: '0.2rem 0.5rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={cantidad <= 1 || isOutOfStock}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'none',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: cantidad <= 1 ? 'not-allowed' : 'pointer',
                      color: cantidad <= 1 ? '#cbd5e1' : '#0f172a',
                    }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                    {cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={cantidad >= maxStock || isOutOfStock}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'none',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: cantidad >= maxStock ? 'not-allowed' : 'pointer',
                      color: cantidad >= maxStock ? '#cbd5e1' : '#0f172a',
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Subtotal preview */}
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Subtotal: <strong style={{ color: '#0f172a' }}>{formatCOP(Number(producto.precio || 0) * cantidad)}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`btn btn-primary ${added ? 'btn-success' : ''}`}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {added ? (
                  <>
                    <i className="fa fa-check-circle" /> ¡Agregado al Carrito ({cantidad})!
                  </>
                ) : isOutOfStock ? (
                  <>
                    <i className="fa fa-ban" /> Producto Agotado
                  </>
                ) : (
                  <>
                    <i className="fa fa-shopping-cart" /> Agregar {cantidad > 1 ? `(${cantidad})` : ''} al Carrito
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
