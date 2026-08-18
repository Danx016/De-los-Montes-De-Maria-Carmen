const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

module.exports = (couponController) => {
  const router = express.Router();

  // Ruta pública para obtener cupones activos promocionados en la barra de la tienda
  router.get('/promocionales', (req, res) => couponController.obtenerCuponesPromocionales(req, res));

  // Ruta pública / autenticada para validar cupones en el carrito o checkout
  router.post('/validar', (req, res) => couponController.validarCupon(req, res));

  // Rutas administrativas (Gestión de Cupones)
  router.get('/admin', verifyToken, verifyAdmin, (req, res) => couponController.listarCupones(req, res));
  router.post('/admin', verifyToken, verifyAdmin, (req, res) => couponController.crearCupon(req, res));
  router.put('/admin/:id', verifyToken, verifyAdmin, (req, res) => couponController.actualizarCupon(req, res));
  router.patch('/admin/:id/toggle', verifyToken, verifyAdmin, (req, res) => couponController.toggleCupon(req, res));
  router.patch('/admin/:id/toggle-promocion', verifyToken, verifyAdmin, (req, res) => couponController.togglePromocionCupon(req, res));
  router.delete('/admin/:id', verifyToken, verifyAdmin, (req, res) => couponController.eliminarCupon(req, res));

  return router;
};
