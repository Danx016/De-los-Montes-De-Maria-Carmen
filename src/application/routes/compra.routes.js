/**
 * Rutas: Compras
 */
const express = require('express');
const { verifyToken, verifyVendedor } = require('../middleware/auth');

function createCompraRoutes(compraController) {
  const router = express.Router();

  router.post('/', verifyToken, (req, res) => compraController.crear(req, res));
  router.get('/creditos', verifyToken, (req, res) => compraController.obtenerCreditos(req, res));
  router.post('/wompi-firma', verifyToken, (req, res) => compraController.wompiFirma(req, res));
  router.post('/stripe-intent', verifyToken, (req, res) => compraController.crearStripeIntent(req, res));
  router.get('/usuario/:id_usuario', verifyToken, (req, res) => compraController.historialUsuario(req, res));
  router.get('/recibo/:id_compra', verifyToken, (req, res) => compraController.obtenerRecibo(req, res));
  router.post('/enviar-correo', verifyToken, (req, res) => compraController.enviarReciboCorreo(req, res));
  router.post('/enviar-otp', verifyToken, (req, res) => compraController.enviarOtp(req, res));
  router.post('/verificar-otp', verifyToken, (req, res) => compraController.verificarOtp(req, res));

  // Vendedor / Admin endpoints
  router.put('/:id_compra/estado', verifyToken, verifyVendedor, (req, res) => compraController.actualizarEstadoDespacho(req, res));
  router.get('/todas', verifyToken, verifyVendedor, (req, res) => compraController.listarTodasVendedor(req, res));

  return router;
}

module.exports = createCompraRoutes;