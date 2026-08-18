/**
 * Puerto / Interfaz de Repositorio de Banners (Domain Repository Port)
 * Define las operaciones abstractas para gestión de banners y carrusel hero.
 */
class BannerRepository {
  async obtenerActivos() {
    throw new Error('Método obtenerActivos no implementado');
  }

  async obtenerTodos() {
    throw new Error('Método obtenerTodos no implementado');
  }

  async obtenerPorId(id) {
    throw new Error('Método obtenerPorId no implementado');
  }

  async crear(banner) {
    throw new Error('Método crear no implementado');
  }

  async actualizar(id, banner) {
    throw new Error('Método actualizar no implementado');
  }

  async eliminar(id) {
    throw new Error('Método eliminar no implementado');
  }
}

module.exports = BannerRepository;
