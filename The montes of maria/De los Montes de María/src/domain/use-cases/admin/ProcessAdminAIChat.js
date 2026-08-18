/**
 * Caso de uso: ProcessAdminAIChat
 * Procesa peticiones y acciones de gestión con el Asistente IA Administrador
 */
class ProcessAdminAIChat {
  constructor(iaService, repositories) {
    this.iaService = iaService;
    this.repositories = repositories;
  }

  async execute(prompt, history, adminUserId) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Se requiere un prompt válido.');
    }
    return this.iaService.procesarChatAdmin(prompt, history, adminUserId, this.repositories);
  }
}

module.exports = ProcessAdminAIChat;
