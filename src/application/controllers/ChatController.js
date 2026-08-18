/**
 * Controlador: ChatController
 * Maneja el Asistente IA de Tienda Pública y el Chat de Gestión AdminIA
 */
const ProcessPublicAIChat = require('../../domain/use-cases/chat/ProcessPublicAIChat');

class ChatController {
  constructor({ iaService, productoRepository, usuarioRepository, compraRepository }) {
    this.iaService = iaService;
    this.productoRepository = productoRepository;
    this.usuarioRepository = usuarioRepository;
    this.compraRepository = compraRepository;
    this.processPublicAIChat = new ProcessPublicAIChat(iaService, productoRepository);
  }

  async chatTienda(req, res) {
    try {
      const { message, mensaje, prompt, history } = req.body;
      const cleanMessage = (message || mensaje || prompt || '').trim();
      const result = await this.processPublicAIChat.execute(cleanMessage, history || []);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async adminChat(req, res) {
    try {
      const { message, history } = req.body;
      const adminUserId = req.user ? req.user.id : 1;
      const result = await this.iaService.procesarChatAdmin(message, history || [], adminUserId, {
        usuarioRepository: this.usuarioRepository,
        productoRepository: this.productoRepository,
        compraRepository: this.compraRepository
      });
      res.json({ reply: result.respuesta, reloadData: result.reloadData });
    } catch (error) {
      res.status(500).json({ error: 'Error en chat de administración.' });
    }
  }
}

module.exports = ChatController;
