/**
 * Rutas: Administración
 */
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

function createAdminRoutes(adminController) {
  const router = express.Router();

  router.use(verifyToken, verifyAdmin);

  router.get('/estadisticas', (req, res) => adminController.obtenerEstadisticas(req, res));
  router.get('/usuarios', (req, res) => adminController.listarUsuarios(req, res));
  router.post('/usuarios', (req, res) => adminController.crearUsuario(req, res));
  router.get('/usuarios/:id_usuario', (req, res) => adminController.obtenerUsuarioPorId(req, res));
  router.put('/usuarios/:id_usuario', (req, res) => adminController.actualizarUsuario(req, res));
  router.delete('/usuarios/:id_usuario', (req, res) => adminController.eliminarUsuario(req, res));
  router.get('/compras', (req, res) => adminController.listarComprasGlobales(req, res));
  router.delete('/compras/:id_compra', (req, res) => adminController.eliminarCompra(req, res));
  
  // Productos Globales (CRUD Admin con fotos)
  const { uploadProductImage, uploadCategoryImage } = require('../middleware/upload');
  router.get('/productos', (req, res) => adminController.listarProductosGlobal(req, res));
  router.post('/productos', uploadProductImage.single('imagen'), (req, res) => adminController.crearProducto(req, res));
  router.put('/productos/:id_producto', uploadProductImage.single('imagen'), (req, res) => adminController.actualizarProducto(req, res));
  router.delete('/productos/:id_producto', (req, res) => adminController.eliminarProducto(req, res));

  // Categorías (CRUD Real con imágenes)
  router.get('/categorias', (req, res) => adminController.listarCategorias(req, res));
  router.post('/categorias', uploadCategoryImage.single('imagen'), (req, res) => adminController.crearCategoria(req, res));
  router.put('/categorias/:id_categoria', uploadCategoryImage.single('imagen'), (req, res) => adminController.actualizarCategoria(req, res));
  router.delete('/categorias/:id_categoria', (req, res) => adminController.eliminarCategoria(req, res));

  router.post('/ia-chat', (req, res) => adminController.chatIA(req, res));

  return router;
}

module.exports = createAdminRoutes;
