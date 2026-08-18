/**
 * Puerto / Interfaz de Repositorio de Categorías (Domain Repository Port)
 * Define las operaciones abstractas para gestión de categorías de productos.
 */
class CategoriaRepository {
  async obtenerTodas() {
    throw new Error('Método obtenerTodas no implementado');
  }

  async obtenerPorId(id) {
    throw new Error('Método obtenerPorId no implementado');
  }

  async obtenerPorSlug(slug) {
    throw new Error('Método obtenerPorSlug no implementado');
  }

  async crear(categoria) {
    throw new Error('Método crear no implementado');
  }

  async actualizar(id, categoria) {
    throw new Error('Método actualizar no implementado');
  }

  async eliminar(id) {
    throw new Error('Método eliminar no implementado');
  }
}

module.exports = CategoriaRepository;
