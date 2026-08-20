/**
 * Controlador: ProductoController
 * Maneja operaciones del catálogo de productos mediante casos de uso y repositorios inyectados
 */
const CreateProduct = require('../../domain/use-cases/CreateProduct');
const UpdateProduct = require('../../domain/use-cases/product/UpdateProduct');
const DeleteProduct = require('../../domain/use-cases/product/DeleteProduct');
const SearchProducts = require('../../domain/use-cases/product/SearchProducts');

class ProductoController {
  constructor({ productoRepository, categoriaRepository }) {
    this.productoRepository = productoRepository;
    this.categoriaRepository = categoriaRepository;
    this.createProduct = new CreateProduct(productoRepository);
    this.updateProduct = new UpdateProduct(productoRepository);
    this.deleteProduct = new DeleteProduct(productoRepository);
    this.searchProducts = new SearchProducts(productoRepository);
  }

  async listar(req, res) {
    try {
      const productos = await this.productoRepository.listarTodos();
      res.json(productos.map(p => p.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener productos' });
    }
  }

  async obtenerPorId(req, res) {
    try {
      const producto = await this.productoRepository.buscarPorId(req.params.id_producto);
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(producto.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener producto' });
    }
  }

  async crear(req, res) {
    try {
      const { nombre, precio, imagen, descripcion, categoria, origen, presentacion, cuidado, disponibilidad, id_vendedor } = req.body;
      const finalImagen = req.file ? `/uploads/products/${req.file.filename}` : (imagen || null);

      if (!finalImagen) {
        return res.status(400).json({ error: 'Se requiere una URL de imagen o subir un archivo.' });
      }

      const vendorId = req.user?.id || id_vendedor || null;

      const nuevo = await this.createProduct.execute({
        id_vendedor: vendorId,
        id_proveedor: vendorId,
        nombre_producto: nombre,
        precio: parseFloat(precio),
        imagen: finalImagen,
        descripcion,
        categoria,
        origen,
        presentacion,
        cuidado,
        disponibilidad
      });

      res.status(201).json(nuevo.toJSON());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async actualizar(req, res) {
    try {
      const productId = req.params.id_producto;
      const { nombre, precio, imagen, descripcion, categoria, origen, presentacion, cuidado, disponibilidad, stock } = req.body;

      const current = await this.productoRepository.buscarPorId(productId);
      if (!current) return res.status(404).json({ error: 'Producto no encontrado' });

      // Verificación de pertenencia si no es administrador
      const userRole = Number(req.user?.role || req.user?.id_rol);
      const userId = Number(req.user?.id || req.user?.id_usuario);
      if (userRole !== 1 && req.user?.username !== 'admin') {
        const prodVendorId = Number(current.id_vendedor || current.id_proveedor);
        if (prodVendorId !== userId) {
          return res.status(403).json({ error: 'No tienes permisos para modificar este producto de otro vendedor.' });
        }
      }

      const finalImagen = req.file ? `/uploads/products/${req.file.filename}` : (imagen || current.imagen);

      const updated = await this.updateProduct.execute(productId, {
        nombre_producto: nombre !== undefined ? nombre : current.nombre_producto,
        precio: precio !== undefined ? parseFloat(precio) : current.precio,
        stock: stock !== undefined ? parseInt(stock, 10) : current.stock,
        imagen: finalImagen,
        descripcion: descripcion !== undefined ? descripcion : current.descripcion,
        categoria: categoria !== undefined ? categoria : current.categoria,
        origen: origen !== undefined ? origen : current.origen,
        presentacion: presentacion !== undefined ? presentacion : current.presentacion,
        cuidado: cuidado !== undefined ? cuidado : current.cuidado,
        disponibilidad: disponibilidad !== undefined ? disponibilidad : current.disponibilidad
      });

      res.json(updated.toJSON());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminar(req, res) {
    try {
      const productId = req.params.id_producto;
      const current = await this.productoRepository.buscarPorId(productId);
      if (!current) return res.status(404).json({ error: 'Producto no encontrado' });

      // Verificación de pertenencia si no es administrador
      const userRole = Number(req.user?.role || req.user?.id_rol);
      const userId = Number(req.user?.id || req.user?.id_usuario);
      if (userRole !== 1 && req.user?.username !== 'admin') {
        const prodVendorId = Number(current.id_vendedor || current.id_proveedor);
        if (prodVendorId !== userId) {
          return res.status(403).json({ error: 'No tienes permisos para eliminar este producto de otro vendedor.' });
        }
      }

      await this.deleteProduct.execute(productId);
      res.json({ success: true, message: '¡Producto eliminado con éxito!' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async listarCategorias(req, res) {
    try {
      if (!this.categoriaRepository) {
        return res.json([]);
      }
      const categorias = await this.categoriaRepository.obtenerTodas();
      res.json(categorias || []);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener categorías' });
    }
  }

  async buscar(req, res) {
    try {
      const q = (req.query.q || '').trim();
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
      const resultados = await this.searchProducts.execute(q, limit);
      res.json(resultados.map(p => p.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al buscar productos' });
    }
  }
}

module.exports = ProductoController;