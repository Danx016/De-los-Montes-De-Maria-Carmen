/**
 * Interfaz de repositorio: CompraRepository
 * Define las operaciones que debe implementar cualquier repositorio de compras
 */
class CompraRepository {
  async crear(compra) {
    throw new Error('Método no implementado');
  }

  async buscarPorId(id) {
    throw new Error('Método no implementado');
  }

  async actualizar(id, datos) {
    throw new Error('Método no implementado');
  }

  async actualizarEstado(id, estado) {
    throw new Error('Método no implementado');
  }

  async procesarReembolso(id) {
    throw new Error('Método no implementado');
  }

  async eliminar(id) {
    throw new Error('Método no implementado');
  }

  async listarTodos() {
    throw new Error('Método no implementado');
  }

  async listarPorUsuario(idUsuario) {
    throw new Error('Método no implementado');
  }

  async listarPorEstado(estado) {
    throw new Error('Método no implementado');
  }

  async agregarDetalle(idCompra, detalle) {
    throw new Error('Método no implementado');
  }

  async obtenerDetalles(idCompra) {
    throw new Error('Método no implementado');
  }

  async obtenerEstadisticasGlobales() {
    throw new Error('Método no implementado');
  }

  async obtenerDesgloseEstadisticas() {
    throw new Error('Método no implementado');
  }
}

module.exports = CompraRepository;