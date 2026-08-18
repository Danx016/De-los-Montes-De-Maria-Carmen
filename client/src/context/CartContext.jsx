import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const CartContext = createContext(null)

const CART_KEY = 'cart'

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY)) || []
    if (!Array.isArray(raw)) return []
    return raw
      .filter((i) => i && (i.id_producto || i.id))
      .map((i) => {
        const prodId = Number(i.id_producto || i.id) || 1
        const precio = parseFloat(i.precio) || 0
        const cantidad = parseInt(i.cantidad, 10) > 0 ? parseInt(i.cantidad, 10) : 1
        return {
          ...i,
          id_producto: prodId,
          id: prodId,
          nombre: i.nombre || i.nombre_producto || 'Producto Campesino',
          nombre_producto: i.nombre || i.nombre_producto || 'Producto Campesino',
          precio,
          cantidad,
        }
      })
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  // Persistir en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((producto, cantidad = 1) => {
    if (!producto) return
    const prodId = Number(producto.id_producto || producto.id)
    const cleanProd = {
      ...producto,
      id_producto: prodId,
      id: prodId,
      nombre: producto.nombre || producto.nombre_producto || 'Producto Campesino',
      nombre_producto: producto.nombre || producto.nombre_producto || 'Producto Campesino',
      precio: parseFloat(producto.precio) || 0,
      imagen: producto.imagen || '',
      categoria: producto.categoria || 'cosechas',
      stock: producto.stock !== undefined ? parseInt(producto.stock, 10) : 25,
    }

    setItems((prev) => {
      const existing = prev.find((i) => Number(i.id_producto || i.id) === prodId)
      if (existing) {
        return prev.map((i) =>
          Number(i.id_producto || i.id) === prodId
            ? { ...i, ...cleanProd, cantidad: (i.cantidad || 1) + cantidad }
            : i
        )
      }
      return [...prev, { ...cleanProd, cantidad }]
    })
  }, [])

  const removeItem = useCallback((id_producto) => {
    const targetId = Number(id_producto)
    setItems((prev) => prev.filter((i) => Number(i.id_producto || i.id) !== targetId))
  }, [])

  const updateQty = useCallback((id_producto, cantidad) => {
    const targetId = Number(id_producto)
    if (cantidad <= 0) return removeItem(targetId)
    setItems((prev) =>
      prev.map((i) =>
        Number(i.id_producto || i.id) === targetId ? { ...i, cantidad } : i
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const count = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
