/**
 * Rutas: Productos
 */
const express = require('express');
const { verifyToken, verifyVendedor } = require('../middleware/auth');
const { uploadProductImage, handleMulterUpload } = require('../middleware/upload');
const { productRules, productIdParamRule, handleValidation } = require('../middleware/validate');

function createProductoRoutes(productoController) {
  const router = express.Router();

  router.get('/', (req, res) => productoController.listar(req, res));
  router.get('/categorias', (req, res) => productoController.listarCategorias(req, res));
  router.get('/buscar', (req, res) => productoController.buscar(req, res));
  router.get('/:id_producto', productIdParamRule, handleValidation, (req, res) => productoController.obtenerPorId(req, res));

  // Endpoints para Vendedores y Admin
  router.post('/', verifyToken, verifyVendedor, handleMulterUpload(uploadProductImage.single('imageFile')), productRules, handleValidation, (req, res) => productoController.crear(req, res));
  router.put('/:id_producto', verifyToken, verifyVendedor, handleMulterUpload(uploadProductImage.single('imageFile')), productIdParamRule, productRules, handleValidation, (req, res) => productoController.actualizar(req, res));
  router.delete('/:id_producto', verifyToken, verifyVendedor, productIdParamRule, handleValidation, (req, res) => productoController.eliminar(req, res));

  return router;
}

module.exports = createProductoRoutes;