const express = require('express');

function createTelegramRoutes(telegramService) {
  const router = express.Router();

  // Webhook para recibir mensajes y comandos de Telegram
  router.post('/webhook', async (req, res) => {
    try {
      const update = req.body;
      const result = await telegramService.procesarUpdate(update);
      res.json(result);
    } catch (err) {
      console.error('[Telegram Webhook Route Error]:', err);
      res.status(200).json({ ok: true }); // Siempre responder 200 a Telegram para evitar reintentos en bucle
    }
  });

  // Estado del bot y prueba de conexión
  router.get('/status', async (req, res) => {
    try {
      const me = await telegramService.request('getMe');
      res.json({
        ok: true,
        bot: me.result || me,
        subscribersCount: telegramService.subscribers.size,
        adminChatIdConfigured: !!telegramService.adminChatId,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Enviar mensaje de prueba a suscriptores
  router.post('/test', async (req, res) => {
    try {
      const { text } = req.body;
      const msg = text || '🌾 <b>Mensaje de prueba</b> desde el servidor de <i>De los Montes de María</i>.';
      await telegramService.broadcastAdmins(msg);
      res.json({ ok: true, message: 'Mensaje enviado a los suscriptores registrados.' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = createTelegramRoutes;
