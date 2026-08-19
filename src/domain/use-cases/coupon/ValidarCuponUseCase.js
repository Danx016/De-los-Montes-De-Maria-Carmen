const Cupon = require('../../entities/Cupon');

/**
 * Caso de Uso: ValidarCuponUseCase
 * Valida un cupón ingresado por un cliente y calcula el descuento exacto.
 */
class ValidarCuponUseCase {
  constructor(couponRepository) {
    this.couponRepository = couponRepository;
  }

  async execute({ codigo, total = 0 }) {
    if (!codigo || !codigo.trim()) {
      throw new Error('Ingresa un código de cupón.');
    }

    const totalNum = Number(total || 0);
    const cuponData = await this.couponRepository.obtenerPorCodigo(codigo.trim());

    if (!cuponData) {
      throw new Error('El cupón ingresado no existe.');
    }

    const cupon = new Cupon(cuponData);

    if (!cupon.activo) {
      throw new Error('Este cupón se encuentra inactivo o deshabilitado.');
    }

    if (cupon.fecha_expiracion && new Date() > cupon.fecha_expiracion) {
      throw new Error('Este cupón ha expirado.');
    }

    if (cupon.uso_limite !== null && cupon.uso_actual >= cupon.uso_limite) {
      throw new Error('Este cupón ha alcanzado el límite máximo de usos.');
    }

    if (cupon.monto_minimo > 0 && totalNum < cupon.monto_minimo) {
      const minFormatted = cupon.monto_minimo.toLocaleString('es-CO');
      throw new Error(`Este cupón requiere una compra mínima de $${minFormatted} COP.`);
    }

    const descuentoCalculado = cupon.calcularDescuento(totalNum);
    const nuevoTotal = Math.max(0, totalNum - descuentoCalculado);

    return {
      valido: true,
      cupon: {
        id_cupon: cupon.id_cupon,
        codigo: cupon.codigo,
        descripcion: cupon.descripcion,
        descuento_porcentaje: cupon.descuento_porcentaje,
        descuento_fijo: cupon.descuento_fijo,
        color_tema: cupon.color_tema,
        descuento: descuentoCalculado,
        subtotal_original: totalNum,
        nuevo_total: nuevoTotal,
      },
      id_cupon: cupon.id_cupon,
      codigo: cupon.codigo,
      descripcion: cupon.descripcion,
      color_tema: cupon.color_tema,
      porcentaje: cupon.descuento_porcentaje,
      descuento_fijo: cupon.descuento_fijo,
      descuento_calculado: descuentoCalculado,
      subtotal_original: totalNum,
      nuevo_total: nuevoTotal,
      mensaje: cupon.descuento_porcentaje > 0
        ? `¡Cupón ${cupon.codigo} aplicado! -${cupon.descuento_porcentaje}% de descuento`
        : `¡Cupón ${cupon.codigo} aplicado! -$${descuentoCalculado.toLocaleString('es-CO')} COP`
    };
  }
}

module.exports = ValidarCuponUseCase;
