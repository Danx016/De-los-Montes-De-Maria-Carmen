/**
 * Entidad de dominio: SoporteTicket
 * Representa un ticket de soporte en el sistema
 */
class SoporteTicket {
  constructor({
    id,
    ticket_code,
    session_id,
    id_usuario,
    nombre_cliente,
    correo_cliente,
    telefono_cliente,
    asunto,
    estado,
    id_agente,
    nombre_agente,
    created_at,
    updated_at,
    mensajes
  }) {
    this.id = id;
    this.ticket_code = ticket_code;
    this.session_id = session_id;
    this.id_usuario = id_usuario;
    this.nombre_cliente = nombre_cliente;
    this.correo_cliente = correo_cliente;
    this.telefono_cliente = telefono_cliente;
    this.asunto = asunto;
    this.estado = estado || 'bot';
    this.id_agente = id_agente;
    this.nombre_agente = nombre_agente;
    this.created_at = created_at || new Date();
    this.updated_at = updated_at || new Date();
    this.mensajes = mensajes || [];
  }

  // Métodos de negocio
  generarTicketCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.ticket_code = `TKT-${timestamp}-${random}`;
    return this.ticket_code;
  }

  estaEnBot() {
    return this.estado === 'bot';
  }

  estaAsignado() {
    return this.estado === 'asignado' || this.estado === 'en_proceso';
  }

  estaCerrado() {
    return this.estado === 'cerrado' || this.estado === 'resuelto';
  }

  puedeAsignar() {
    return this.estaEnBot();
  }

  asignarAgente(agenteId, nombreAgente) {
    if (!this.puedeAsignar()) {
      throw new Error('Solo se pueden asignar tickets en estado bot');
    }
    this.id_agente = agenteId;
    this.nombre_agente = nombreAgente;
    this.estado = 'asignado';
    this.actualizarTimestamp();
  }

  agregarMensaje(mensaje) {
    if (!mensaje.mensaje || mensaje.mensaje.trim() === '') {
      throw new Error('El mensaje no puede estar vacío');
    }
    this.mensajes.push({
      ...mensaje,
      fecha: mensaje.fecha || new Date(),
      leido: mensaje.leido || false
    });
    this.actualizarTimestamp();
  }

  actualizarEstado(nuevoEstado) {
    const estadosValidos = ['bot', 'asignado', 'en_proceso', 'cerrado', 'resuelto'];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error('Estado no válido');
    }
    this.estado = nuevoEstado;
    this.actualizarTimestamp();
  }

  cerrar() {
    if (this.estaCerrado()) {
      throw new Error('El ticket ya está cerrado');
    }
    this.estado = 'cerrado';
    this.actualizarTimestamp();
  }

  actualizarTimestamp() {
    this.updated_at = new Date();
  }

  validarDatos() {
    if (!this.nombre_cliente || this.nombre_cliente.trim() === '') {
      throw new Error('El nombre del cliente es requerido');
    }
    if (!this.correo_cliente || !this.validarEmail(this.correo_cliente)) {
      throw new Error('El correo del cliente no es válido');
    }
    if (!this.asunto || this.asunto.trim() === '') {
      throw new Error('El asunto es requerido');
    }
  }

  validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  toJSON() {
    return {
      id: this.id,
      ticket_code: this.ticket_code,
      session_id: this.session_id,
      id_usuario: this.id_usuario,
      nombre_cliente: this.nombre_cliente,
      correo_cliente: this.correo_cliente,
      telefono_cliente: this.telefono_cliente,
      asunto: this.asunto,
      estado: this.estado,
      id_agente: this.id_agente,
      nombre_agente: this.nombre_agente,
      created_at: this.created_at,
      updated_at: this.updated_at,
      mensajes: this.mensajes
    };
  }
}

module.exports = SoporteTicket;