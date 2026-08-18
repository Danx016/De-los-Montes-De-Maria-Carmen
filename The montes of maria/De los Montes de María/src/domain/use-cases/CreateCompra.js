/**
 * Caso de uso: CreateCompra
 * Encapsula la lógica de negocio para la creación de compras
 */
const Compra = require('../entities/Compra');
const Producto = require('../entities/Producto');

class CreateCompra {
  constructor(compraRepository, productoRepository, usuarioRepository) {
    this.compraRepository = compraRepository;
    this.productoRepository = productoRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async execute(datosCompra) {
    // Validar datos de la compra
    const compra = new Compra(datosCompra);
    compra.validarDatos();

    // Verificar que el usuario existe
    const usuario = await this.usuarioRepository.buscarPorId(compra.id_usuario);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar stock disponible para cada producto
    for (const detalle of compra.detalles) {
      const producto = await this.productoRepository.buscarPorId(detalle.id_producto);
      if (!producto) {
        throw new Error(`Producto con ID ${detalle.id_producto} no encontrado`);
      }
      if (!producto.tieneStockSuficiente(detalle.cantidad)) {
        throw new Error(`Stock insuficiente para el producto: ${producto.nombre_producto}`);
      }
    }

    // Calcular total de la compra
    compra.calcularTotal();

    // Crear compra en el repositorio
    const compraCreada = await this.compraRepository.crear(compra);

    // Reducir stock de los productos
    for (const detalle of compra.detalles) {
      await this.productoRepository.actualizarStock(
        detalle.id_producto,
        -detalle.cantidad
      );
    }

    return compraCreada;
  }

  async actualizarEstado(idCompra, nuevoEstado) {
    const compra = await this.compraRepository.buscarPorId(idCompra);
    if (!compra) {
      throw new Error('Compra no encontrada');
    }

    compra.actualizarEstado(nuevoEstado);
    await this.compraRepository.actualizarEstado(idCompra, nuevoEstado);

    return compra;
  }

  async cancelarCompra(idCompra) {
    const compra = await this.compraRepository.buscarPorId(idCompra);
    if (!compra) {
      throw new Error('Compra no encontrada');
    }

    if (!compra.puedeCancelar()) {
      throw new Error('No se puede cancelar esta compra');
    }

    // Devolver stock de los productos
    for (const detalle of compra.detalles) {
      await this.productoRepository.actualizarStock(
        detalle.id_producto,
        detalle.cantidad
      );
    }

    compra.cancelar();
    await this.compraRepository.actualizarEstado(idCompra, compra.estado);

    return compra;
  }

  async listarComprasUsuario(idUsuario) {
    return await this.compraRepository.listarPorUsuario(idUsuario);
  }

  async procesarReembolso(idCompra) {
    const compra = await this.compraRepository.buscarPorId(idCompra);
    if (!compra) {
      throw new Error('Compra no encontrada');
    }

    compra.procesarReembolso();
    await this.compraRepository.procesarReembolso(idCompra);

    return compra;
  }
}

module.exports = CreateCompra;