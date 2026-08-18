/**
 * Puerto / Interfaz de Repositorio de Cupones (Domain Repository Port)
 * Define las operaciones abstractas que cualquier adaptador de persistencia debe implementar.
 */
class CouponRepository {
  async obtenerTodos() {
    throw new Error('Método obtenerTodos no implementado');
  }

  async obtenerPorId(idCupon) {
    throw new Error('Método obtenerPorId no implementado');
  }

  async obtenerPorCodigo(codigo) {
    throw new Error('Método obtenerPorCodigo no implementado');
  }

  async obtenerPromocionales() {
    throw new Error('Método obtenerPromocionales no implementado');
  }

  async crear(cupon) {
    throw new Error('Método crear no implementado');
  }

  async actualizar(idCupon, cupon) {
    throw new Error('Método actualizar no implementado');
  }

  async incrementarUso(codigo) {
    throw new Error('Método incrementarUso no implementado');
  }

  async toggleActivo(idCupon) {
    throw new Error('Método toggleActivo no implementado');
  }

  async togglePromocion(idCupon) {
    throw new Error('Método togglePromocion no implementado');
  }

  async eliminar(idCupon) {
    throw new Error('Método eliminar no implementado');
  }
}

module.exports = CouponRepository;
