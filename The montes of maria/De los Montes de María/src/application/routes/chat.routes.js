/**
 * Rutas: Chat & Asistentes de IA
 */
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

function createChatRoutes(chatController) {
  const router = express.Router();

  router.post('/', (req, res) => chatController.chatTienda(req, res));
  router.post('/public', (req, res) => chatController.chatTienda(req, res));
  router.post('/admin-chat', verifyToken, verifyAdmin, (req, res) => chatController.adminChat(req, res));

  return router;
}

module.exports = createChatRoutes;
