/**
 * Entidad de Dominio: Banner
 * Representa una diapositiva o banner interactivo del carrusel Hero.
 */
class Banner {
  constructor({
    id_banner = null,
    titulo,
    subtitulo = '',
    categoria_nombre = '',
    categoria_slug = '',
    categoria_thumb = '',
    imagen_fondo = '',
    color_acento = '#22c55e',
    features = [],
    boton_principal_texto = 'Explorar Catálogo',
    boton_principal_link = '/catalogo',
    boton_secundario_texto = 'Vender mis Productos',
    boton_secundario_link = '/vendedor',
    tarjeta_badge_top = '🌿 100% Campo',
    tarjeta_imagen = '',
    tarjeta_titulo = '',
    tarjeta_precio = '',
    tarjeta_vendedor_nombre = 'Productor de los Montes',
    tarjeta_vendedor_rating = '⭐ 4.9/5 Calidad',
    tarjeta_vendedor_id = 47,
    orden = 0,
    activo = 1
  }) {
    if (!titulo || !titulo.trim()) {
      throw new Error('El título del banner es obligatorio');
    }

    this.id_banner = id_banner;
    this.titulo = titulo.trim();
    this.subtitulo = subtitulo;
    this.categoria_nombre = categoria_nombre;
    this.categoria_slug = categoria_slug;
    this.categoria_thumb = categoria_thumb;
    this.imagen_fondo = imagen_fondo;
    this.color_acento = color_acento;
    this.features = Array.isArray(features) ? features : [];
    this.boton_principal_texto = boton_principal_texto;
    this.boton_principal_link = boton_principal_link;
    this.boton_secundario_texto = boton_secundario_texto;
    this.boton_secundario_link = boton_secundario_link;
    this.tarjeta_badge_top = tarjeta_badge_top;
    this.tarjeta_imagen = tarjeta_imagen;
    this.tarjeta_titulo = tarjeta_titulo;
    this.tarjeta_precio = tarjeta_precio;
    this.tarjeta_vendedor_nombre = tarjeta_vendedor_nombre;
    this.tarjeta_vendedor_rating = tarjeta_vendedor_rating;
    this.tarjeta_vendedor_id = tarjeta_vendedor_id;
    this.orden = Number(orden || 0);
    this.activo = activo === 1 || activo === true ? 1 : 0;
  }
}

module.exports = Banner;
