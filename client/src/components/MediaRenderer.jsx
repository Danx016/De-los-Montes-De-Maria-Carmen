import React, { useState } from 'react'

/**
 * Universal Media Renderer:
 * Handles inline SVG strings, HTML snippets, direct URLs, uploaded category/product files,
 * and clean FontAwesome icon fallbacks without unwanted default logos.
 */
export default function MediaRenderer({
  src,
  alt = 'Media',
  icon = 'fa-box',
  color = '#2e7d32',
  className = '',
  style = {},
  fallbackSrc = null,
  type = 'category' // 'category' | 'product'
}) {
  const [hasError, setHasError] = useState(false)
  const content = (src || '').trim()

  // Si hubo error de carga o no hay contenido, renderizamos el icono limpio
  if (hasError || !content) {
    return (
      <div
        className={`media-icon-fallback ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: color || 'var(--primary-color)',
          fontSize: '1.25rem',
          ...style,
        }}
      >
        <i className={`fa ${icon || 'fa-box'}`} />
      </div>
    )
  }

  // 1. Detectar si es código SVG o snippet HTML
  if (
    content.startsWith('<') &&
    (content.includes('svg') ||
      content.includes('img') ||
      content.includes('path') ||
      content.includes('div') ||
      content.includes('span') ||
      content.includes('i '))
  ) {
    return (
      <div
        className={`media-html-container ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // 2. Si es una URL o nombre de archivo de imagen
  let finalSrc = content
  if (!content.startsWith('http') && !content.startsWith('data:') && !content.startsWith('/') && !content.startsWith('blob:')) {
    finalSrc = type === 'category' ? `/uploads/categories/${content}` : `/uploads/products/${content}`
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
      onError={() => {
        if (fallbackSrc) {
          // Si tiene fallback explícito
          setHasError(true)
        } else {
          setHasError(true)
        }
      }}
    />
  )
}
