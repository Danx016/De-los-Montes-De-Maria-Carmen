/**
 * Interfaz de repositorio: ProductoRepository
 * Define las operaciones que debe implementar cualquier repositorio de productos
 */
class ProductoRepository {
  async crear(producto) {
    throw new Error('Método no implementado');
  }

  async buscarPorId(id) {
    throw new Error('Método no implementado');
  }

  async actualizar(id, datos) {
    throw new Error('Método no implementado');
  }

  async actualizarStock(id, cantidad) {
    throw new Error('Método no implementado');
  }

  async eliminar(id) {
    throw new Error('Método no implementado');
  }

  async listarTodos() {
    throw new Error('Método no implementado');
  }

  async listarPorCategoria(categoria) {
    throw new Error('Método no implementado');
  }

  async listarPorProveedor(idProveedor) {
    throw new Error('Método no implementado');
  }

  async buscar(termino) {
    throw new Error('Método no implementado');
  }

  async buscarLimitado(termino, limite) {
    throw new Error('Método no implementado');
  }

  async contar() {
    throw new Error('Método no implementado');
  }
}

module.exports = ProductoRepository;