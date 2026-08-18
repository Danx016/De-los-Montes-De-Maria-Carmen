/**
 * Caso de uso: DeleteProduct
 */
class DeleteProduct {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async execute(productId) {
    const existing = await this.productoRepository.buscarPorId(productId);
    if (!existing) throw new Error('Producto no encontrado');
    return this.productoRepository.eliminar(productId);
  }
}

module.exports = DeleteProduct;
