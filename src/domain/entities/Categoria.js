/**
 * Entidad de dominio: Categoria
 * Representa una categoría de productos en el sistema
 */
class Categoria {
  constructor({
    id_categoria,
    nombre_categoria,
    nombre,
    descripcion,
    slug,
    imagen,
    icono,
    color
  }) {
    this.id_categoria = id_categoria;
    this.nombre_categoria = nombre_categoria || nombre;
    this.descripcion = descripcion;
    this.slug = slug || this.generarSlug(this.nombre_categoria);
    this.imagen = imagen || null;
    this.icono = icono || 'fa-box';
    this.color = color || '#2e7d32';
  }

  // Métodos de negocio
  generarSlug(nombre) {
    if (!nombre) return '';
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  validarDatos() {
    if (!this.nombre_categoria || this.nombre_categoria.trim() === '') {
      throw new Error('El nombre de la categoría es requerido');
    }
  }

  tieneDescripcion() {
    return this.descripcion && this.descripcion.trim() !== '';
  }

  toJSON() {
    return {
      id_categoria: this.id_categoria,
      nombre_categoria: this.nombre_categoria,
      descripcion: this.descripcion,
      slug: this.slug,
      imagen: this.imagen,
      icono: this.icono,
      color: this.color
    };
  }
}

module.exports = Categoria;