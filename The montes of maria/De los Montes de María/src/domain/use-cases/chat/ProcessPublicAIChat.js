/**
 * Caso de uso: ProcessPublicAIChat
 */
class ProcessPublicAIChat {
  constructor(iaService, productoRepository) {
    this.iaService = iaService;
    this.productoRepository = productoRepository;
  }

  async execute(message, history = []) {
    if (!message || !message.trim()) {
      throw new Error('El mensaje es requerido.');
    }
    const productos = await this.productoRepository.listarTodos();
    const reply = await this.iaService.procesarChatPublico(message.trim(), history, productos);
    return { reply };
  }
}

module.exports = ProcessPublicAIChat;
