/**
 * Caso de uso: UpdateProduct
 */
class UpdateProduct {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async execute(productId, datos) {
    const existing = await this.productoRepository.buscarPorId(productId);
    if (!existing) throw new Error('Producto no encontrado');
    return this.productoRepository.actualizar(productId, datos);
  }
}

module.exports = UpdateProduct;
