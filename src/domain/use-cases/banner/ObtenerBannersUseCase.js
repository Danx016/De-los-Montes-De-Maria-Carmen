/**
 * Caso de Uso: ObtenerBannersUseCase
 * Recupera los banners activos o la lista completa de banners para el panel de administración.
 */
class ObtenerBannersUseCase {
  constructor(bannerRepository) {
    this.bannerRepository = bannerRepository;
  }

  async executePublicos() {
    return await this.bannerRepository.obtenerActivos();
  }

  async executeTodos() {
    return await this.bannerRepository.obtenerTodos();
  }
}

module.exports = ObtenerBannersUseCase;
