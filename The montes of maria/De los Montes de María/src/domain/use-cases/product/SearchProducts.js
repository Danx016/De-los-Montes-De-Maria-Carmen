/**
 * Caso de uso: SearchProducts
 */
class SearchProducts {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async execute(termino, limite = null) {
    if (!termino || termino.trim() === '') {
      return this.productoRepository.listarTodos();
    }
    if (limite) {
      return this.productoRepository.buscarLimitado(termino.trim(), limite);
    }
    return this.productoRepository.buscar(termino.trim());
  }
}

module.exports = SearchProducts;
