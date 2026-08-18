/**
 * Caso de uso: ProcessSupportAIChat
 */
class ProcessSupportAIChat {
  constructor(iaService, repositories) {
    this.iaService = iaService;
    this.repositories = repositories;
  }

  async execute({ session_id, ticket, mensaje, id_usuario }) {
    return this.iaService.procesarMensajeSoporte({
      session_id,
      ticket,
      mensaje,
      id_usuario,
      repositories: this.repositories
    });
  }
}

module.exports = ProcessSupportAIChat;
