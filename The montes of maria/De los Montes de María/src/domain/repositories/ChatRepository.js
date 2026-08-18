/**
 * Interfaz de repositorio: ChatRepository
 * Define operaciones de mensajería y chat
 */
class ChatRepository {
  async guardarMensaje(mensaje) {
    throw new Error('Método no implementado');
  }

  async obtenerHistorialPorTicket(ticketId, limite = 30) {
    throw new Error('Método no implementado');
  }

  async obtenerHistorialPorSesion(sessionId, limite = 30) {
    throw new Error('Método no implementado');
  }

  async marcarLeidos(ticketId, rol) {
    throw new Error('Método no implementado');
  }
}

module.exports = ChatRepository;
