const express = require('express');
const { uploadSupportImage } = require('../middleware/upload');
const { verifyToken, verifyAdmin, verifyAdminOrSupport } = require('../middleware/auth');

function createSoporteRoutes(soporteController) {
  const router = express.Router();

  router.post('/upload-imagen', uploadSupportImage.single('imagen'), (req, res) => soporteController.subirImagen(req, res));
  router.post('/crear-ticket', (req, res) => soporteController.crearTicket(req, res));
  router.post('/mensaje', (req, res) => soporteController.enviarMensaje(req, res));
  router.post('/solicitar-agente', (req, res) => soporteController.solicitarAgente(req, res));
  router.post('/cerrar-ticket', (req, res) => soporteController.cerrarTicket(req, res));
  router.post('/calificar', (req, res) => soporteController.calificar(req, res));
  router.get('/buscar', (req, res) => soporteController.buscar(req, res));

  // Admin & Asesores
  router.get('/agentes', verifyToken, verifyAdminOrSupport, (req, res) => soporteController.listarAgentes(req, res));
  router.post('/asignar-agente', verifyToken, verifyAdmin, (req, res) => soporteController.asignarAgente(req, res));
  router.get('/stats-agentes', verifyToken, verifyAdminOrSupport, (req, res) => soporteController.statsAgentes(req, res));
  router.get('/todas-calificaciones', verifyToken, verifyAdminOrSupport, (req, res) => soporteController.todasCalificaciones(req, res));

  return router;
}

module.exports = createSoporteRoutes;