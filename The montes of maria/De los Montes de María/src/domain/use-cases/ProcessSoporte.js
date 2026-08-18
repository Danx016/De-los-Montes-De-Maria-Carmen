/**
 * Caso de uso: ProcessSoporte
 * Encapsula la lógica de negocio para el procesamiento de tickets de soporte
 */
const SoporteTicket = require('../entities/SoporteTicket');

class ProcessSoporte {
  constructor(soporteRepository, usuarioRepository) {
    this.soporteRepository = soporteRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async crearTicket(datosTicket) {
    // Validar datos del ticket
    const ticket = new SoporteTicket(datosTicket);
    ticket.validarDatos();

    // Generar código único del ticket
    ticket.generarTicketCode();

    // Crear ticket en el repositorio
    const ticketCreado = await this.soporteRepository.crearTicket(ticket);

    return ticketCreado;
  }

  async buscarTicketPorCodigo(codigo) {
    return await this.soporteRepository.buscarTicketPorCodigo(codigo);
  }

  async buscarTicketPorSessionId(sessionId) {
    return await this.soporteRepository.buscarTicketPorSessionId(sessionId);
  }

  async asignarAgente(ticketId, agenteId, nombreAgente) {
    const ticket = await this.soporteRepository.buscarTicketPorId(ticketId);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    // Verificar que el agente existe
    const agente = await this.usuarioRepository.buscarPorId(agenteId);
    if (!agente) {
      throw new Error('Agente no encontrado');
    }

    ticket.asignarAgente(agenteId, nombreAgente);
    await this.soporteRepository.asignarAgente(ticketId, agenteId, nombreAgente);

    return ticket;
  }

  async agregarMensaje(ticketId, datosMensaje) {
    const ticket = await this.soporteRepository.buscarTicketPorId(ticketId);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    const mensaje = {
      ticket_id: ticketId,
      session_id: ticket.session_id,
      id_usuario: datosMensaje.id_usuario,
      nombre_remitente: datosMensaje.nombre_remitente,
      rol: datosMensaje.rol,
      mensaje: datosMensaje.mensaje,
      fecha: new Date(),
      leido: false
    };

    ticket.agregarMensaje(mensaje);
    await this.soporteRepository.agregarMensaje(mensaje);

    return mensaje;
  }

  async actualizarEstado(ticketId, nuevoEstado) {
    const ticket = await this.soporteRepository.buscarTicketPorId(ticketId);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    ticket.actualizarEstado(nuevoEstado);
    await this.soporteRepository.actualizarEstadoTicket(ticketId, nuevoEstado);

    return ticket;
  }

  async cerrarTicket(ticketId) {
    const ticket = await this.soporteRepository.buscarTicketPorId(ticketId);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    ticket.cerrar();
    await this.soporteRepository.actualizarEstadoTicket(ticketId, ticket.estado);

    return ticket;
  }

  async listarTicketsPorEstado(estado) {
    return await this.soporteRepository.listarTicketsPorEstado(estado);
  }

  async listarTicketsPorAgente(agenteId) {
    return await this.soporteRepository.listarTicketsPorAgente(agenteId);
  }

  async obtenerMensajes(ticketId) {
    return await this.soporteRepository.obtenerMensajes(ticketId);
  }

  async crearCalificacion(ticketId, datosCalificacion) {
    const ticket = await this.soporteRepository.buscarTicketPorId(ticketId);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    if (!ticket.estaCerrado()) {
      throw new Error('Solo se pueden calificar tickets cerrados');
    }

    const calificacion = {
      ticket_id: ticketId,
      session_id: ticket.session_id,
      id_agente: datosCalificacion.id_agente,
      nombre_agente: datosCalificacion.nombre_agente,
      estrellas: datosCalificacion.estrellas,
      comentario: datosCalificacion.comentario,
      created_at: new Date()
    };

    return await this.soporteRepository.crearCalificacion(calificacion);
  }
}

module.exports = ProcessSoporte;