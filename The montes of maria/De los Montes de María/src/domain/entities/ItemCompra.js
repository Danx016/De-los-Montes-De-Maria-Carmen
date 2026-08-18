/**
 * Entidad de dominio: ItemCompra
 * Representa un ítem individual de una orden de compra
 */
class ItemCompra {
  constructor({ id_detalle, id_compra, id_producto, nombre_producto, presentacion, cantidad, precio_unitario }) {
    this.id_detalle = id_detalle;
    this.id_compra = id_compra;
    this.id_producto = id_producto;
    this.nombre_producto = nombre_producto;
    this.presentacion = presentacion;
    this.cantidad = parseInt(cantidad, 10) || 1;
    this.precio_unitario = parseFloat(precio_unitario) || 0;
  }

  getSubtotal() {
    return this.cantidad * this.precio_unitario;
  }

  toJSON() {
    return {
      id_detalle: this.id_detalle,
      id_compra: this.id_compra,
      id_producto: this.id_producto,
      nombre_producto: this.nombre_producto,
      presentacion: this.presentacion,
      cantidad: this.cantidad,
      precio_unitario: this.precio_unitario,
      subtotal: this.getSubtotal()
    };
  }
}

module.exports = ItemCompra;
