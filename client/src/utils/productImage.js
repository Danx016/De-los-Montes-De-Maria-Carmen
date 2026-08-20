/**
 * Utilidad para resolver y normalizar URLs de imágenes de productos
 * Previene duplicación de rutas como /uploads//uploads/products/...
 * y proporciona un fallback limpio y consistente.
 */
export function getProductImageUrl(imgOrProduct, fallback = '/img/Logo.jpg') {
  if (!imgOrProduct) return fallback;

  const raw =
    typeof imgOrProduct === 'object'
      ? (imgOrProduct.imagen ||
         imgOrProduct.imagen_producto ||
         imgOrProduct.foto ||
         imgOrProduct.image ||
         imgOrProduct.tarjeta_imagen)
      : imgOrProduct;

  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Si ya es una URL externa (http/https), data URI, o blob URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Si ya empieza con /uploads/ o /img/
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/img/')) {
    return trimmed;
  }

  // Si empieza con uploads/ o img/ sin slash inicial
  if (trimmed.startsWith('uploads/') || trimmed.startsWith('img/')) {
    return `/${trimmed}`;
  }

  // Si empieza con products/ o categories/ o profiles/
  if (
    trimmed.startsWith('products/') ||
    trimmed.startsWith('categories/') ||
    trimmed.startsWith('profiles/') ||
    trimmed.startsWith('banners/')
  ) {
    return `/uploads/${trimmed}`;
  }

  // Si empieza con / pero no con /uploads
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Si es solo un nombre de archivo (ej. 1740089123-yuca.jpg o name.png)
  return `/uploads/products/${trimmed}`;
}

export function handleProductImageError(e, fallback = '/img/Logo.jpg') {
  if (e?.target && e.target.src !== fallback && !e.target.src.endsWith(fallback)) {
    e.target.src = fallback;
  }
}
