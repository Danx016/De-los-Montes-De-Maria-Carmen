/**
 * Interfaz de repositorio: SoporteRepository
 * Define las operaciones que debe implementar cualquier repositorio de soporte
 */
class SoporteRepository {
  async crearTicket(ticket) {
    throw new Error('Método no implementado');
  }

  async buscarTicketPorId(id) {
    throw new Error('Método no implementado');
  }

  async buscarTicketPorCodigo(codigo) {
    throw new Error('Método no implementado');
  }

  async buscarTicketPorSessionId(sessionId) {
    throw new Error('Método no implementado');
  }

  async actualizarTicket(id, datos) {
    throw new Error('Método no implementado');
  }

  async actualizarEstadoTicket(id, estado) {
    throw new Error('Método no implementado');
  }

  async asignarAgente(id, agenteId, nombreAgente) {
    throw new Error('Método no implementado');
  }

  async agregarMensaje(mensaje) {
    throw new Error('Método no implementado');
  }

  async listarTickets() {
    throw new Error('Método no implementado');
  }

  async listarTicketsPorEstado(estado) {
    throw new Error('Método no implementado');
  }

  async listarTicketsPorAgente(agenteId) {
    throw new Error('Método no implementado');
  }

  async listarTicketsPorUsuario(usuarioId) {
    throw new Error('Método no implementado');
  }

  async obtenerMensajes(ticketId) {
    throw new Error('Método no implementado');
  }

  async crearCalificacion(calificacion) {
    throw new Error('Método no implementado');
  }

  async obtenerCalificacion(ticketId) {
    throw new Error('Método no implementado');
  }
}

module.exports = SoporteRepository;