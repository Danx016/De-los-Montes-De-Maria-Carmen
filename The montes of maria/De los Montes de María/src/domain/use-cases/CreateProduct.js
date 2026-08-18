/**
 * Caso de uso: CreateProduct
 * Encapsula la lógica de negocio para la creación de productos
 */
const Producto = require('../entities/Producto');

class CreateProduct {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  async execute(datosProducto) {
    // Validar datos del producto
    const producto = new Producto(datosProducto);
    producto.validarDatos();

    // Establecer fecha de ingreso si no está definida
    if (!producto.fecha_ingreso) {
      producto.fecha_ingreso = new Date();
    }

    // Actualizar disponibilidad según el stock
    producto.actualizarDisponibilidad();

    // Crear producto en el repositorio
    const productoCreado = await this.productoRepository.crear(producto);

    return productoCreado;
  }

  async actualizarStock(idProducto, cantidad) {
    const producto = await this.productoRepository.buscarPorId(idProducto);
    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (cantidad > 0) {
      producto.aumentarStock(cantidad);
    } else {
      producto.reducirStock(Math.abs(cantidad));
    }

    await this.productoRepository.actualizarStock(idProducto, producto.stock);
    return producto;
  }

  async buscarProductos(termino) {
    if (!termino || termino.trim() === '') {
      return await this.productoRepository.listarTodos();
    }
    return await this.productoRepository.buscar(termino);
  }

  async buscarPorCategoria(categoria) {
    return await this.productoRepository.listarPorCategoria(categoria);
  }

  async buscarLimitado(termino, limite = 5) {
    return await this.productoRepository.buscarLimitado(termino, limite);
  }
}

module.exports = CreateProduct;