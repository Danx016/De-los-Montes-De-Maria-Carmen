import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Componente que asegura que al navegar a cualquier ruta,
 * la ventana del navegador siempre inicie desde arriba (top: 0).
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTo(0, 0)
    document.body.scrollTo(0, 0)
  }, [pathname, search])

  return null
}
