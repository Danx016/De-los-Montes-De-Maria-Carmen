/**
 * Entidad de dominio: Producto
 * Representa un producto en el sistema con lógica de negocio pura
 */
class Producto {
  constructor({
    id_producto,
    id_vendedor,
    nombre_producto,
    descripcion,
    precio,
    stock,
    unidad_medida,
    imagen,
    fecha_ingreso,
    id_categoria,
    id_proveedor,
    categoria,
    origen,
    presentacion,
    cuidado,
    disponibilidad,
    vendedor_nombre,
    vendedor_apodo,
    vendedor_avatar,
    vendedor_portada
  }) {
    this.id_producto = id_producto;
    this.id_vendedor = id_vendedor || id_proveedor || null;
    this.nombre_producto = nombre_producto;
    this.descripcion = descripcion;
    this.precio = precio;
    this.stock = stock || 0;
    this.unidad_medida = unidad_medida;
    this.imagen = imagen;
    this.fecha_ingreso = fecha_ingreso;
    this.id_categoria = id_categoria;
    this.id_proveedor = id_proveedor;
    this.categoria = categoria;
    this.origen = origen;
    this.presentacion = presentacion;
    this.cuidado = cuidado;
    this.disponibilidad = disponibilidad;
    this.vendedor_nombre = vendedor_nombre || null;
    this.vendedor_apodo = vendedor_apodo || null;
    this.vendedor_avatar = vendedor_avatar || null;
    this.vendedor_portada = vendedor_portada || null;
  }

  // Métodos de negocio
  estaDisponible() {
    return this.stock > 0 && this.disponibilidad !== 'agotado';
  }

  tieneStockSuficiente(cantidad) {
    return this.stock >= cantidad;
  }

  reducirStock(cantidad) {
    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser positiva');
    }
    if (!this.tieneStockSuficiente(cantidad)) {
      throw new Error('Stock insuficiente');
    }
    this.stock -= cantidad;
    this.actualizarDisponibilidad();
  }

  aumentarStock(cantidad) {
    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser positiva');
    }
    this.stock += cantidad;
    this.actualizarDisponibilidad();
  }

  actualizarDisponibilidad() {
    if (this.stock === 0) {
      this.disponibilidad = 'agotado';
    } else if (this.stock < 10) {
      this.disponibilidad = 'bajo';
    } else {
      this.disponibilidad = 'disponible';
    }
  }

  validarDatos() {
    if (!this.nombre_producto || this.nombre_producto.trim() === '') {
      throw new Error('El nombre del producto es requerido');
    }
    if (!this.precio || this.precio <= 0) {
      throw new Error('El precio debe ser mayor a 0');
    }
    if (this.stock < 0) {
      throw new Error('El stock no puede ser negativo');
    }
  }

  calcularPrecioTotal(cantidad) {
    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser positiva');
    }
    return this.precio * cantidad;
  }

  buscarEnTexto(termino) {
    const texto = `${this.nombre_producto} ${this.descripcion} ${this.categoria}`.toLowerCase();
    return texto.includes(termino.toLowerCase());
  }

  toJSON() {
    return {
      id_producto: this.id_producto,
      id: this.id_producto,
      id_vendedor: this.id_vendedor,
      nombre_producto: this.nombre_producto,
      nombre: this.nombre_producto,
      descripcion: this.descripcion,
      precio: this.precio,
      stock: this.stock,
      unidad_medida: this.unidad_medida,
      imagen: this.imagen,
      fecha_ingreso: this.fecha_ingreso,
      id_categoria: this.id_categoria,
      id_proveedor: this.id_proveedor,
      categoria: this.categoria,
      origen: this.origen,
      presentacion: this.presentacion,
      cuidado: this.cuidado,
      disponibilidad: this.disponibilidad,
      vendedor_nombre: this.vendedor_nombre,
      vendedor_apodo: this.vendedor_apodo,
      vendedor_avatar: this.vendedor_avatar,
      vendedor_portada: this.vendedor_portada
    };
  }
}

module.exports = Producto;