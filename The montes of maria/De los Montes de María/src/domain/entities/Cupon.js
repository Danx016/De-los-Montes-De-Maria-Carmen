/**
 * Entidad de Dominio: Cupon
 * Representa un cupón de descuento en el sistema con reglas de negocio puras.
 */
class Cupon {
  constructor({
    id_cupon = null,
    codigo,
    descripcion = '',
    descuento_porcentaje = 0,
    descuento_fijo = 0,
    monto_minimo = 0,
    uso_limite = null,
    uso_actual = 0,
    fecha_expiracion = null,
    activo = 1,
    promocionar_en_barra = 0,
    mensaje_promocional = null,
    fecha_creacion = new Date()
  }) {
    if (!codigo || !codigo.trim()) {
      throw new Error('El código del cupón es obligatorio');
    }

    this.id_cupon = id_cupon;
    this.codigo = codigo.toUpperCase().trim();
    this.descripcion = descripcion;
    this.descuento_porcentaje = Number(descuento_porcentaje || 0);
    this.descuento_fijo = Number(descuento_fijo || 0);
    this.monto_minimo = Number(monto_minimo || 0);
    this.uso_limite = uso_limite !== null && uso_limite !== undefined ? Number(uso_limite) : null;
    this.uso_actual = Number(uso_actual || 0);
    this.fecha_expiracion = fecha_expiracion ? new Date(fecha_expiracion) : null;
    this.activo = activo === 1 || activo === true ? 1 : 0;
    this.promocionar_en_barra = promocionar_en_barra === 1 || promocionar_en_barra === true ? 1 : 0;
    this.mensaje_promocional = mensaje_promocional;
    this.fecha_creacion = fecha_creacion;
  }

  // Regla de negocio: Verificar si el cupón está vigente
  estaVigente() {
    if (!this.activo) return false;
    if (this.fecha_expiracion && new Date() > this.fecha_expiracion) return false;
    if (this.uso_limite !== null && this.uso_actual >= this.uso_limite) return false;
    return true;
  }

  // Regla de negocio: Calcular descuento sobre un subtotal dado
  calcularDescuento(subtotal) {
    const totalNum = Number(subtotal || 0);
    if (!this.estaVigente()) return 0;
    if (this.monto_minimo > 0 && totalNum < this.monto_minimo) return 0;

    if (this.descuento_porcentaje > 0) {
      return Math.round((totalNum * this.descuento_porcentaje) / 100);
    } else if (this.descuento_fijo > 0) {
      return Math.round(Math.min(totalNum, this.descuento_fijo));
    }
    return 0;
  }
}

module.exports = Cupon;
