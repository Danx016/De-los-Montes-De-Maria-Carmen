/**
 * Entidad de dominio: MensajeChat
 * Representa un mensaje intercambiado en el chat o soporte
 */
class MensajeChat {
  constructor({ id, ticket_id, session_id, id_usuario, nombre_remitente, rol, mensaje, leido = 0, fecha = new Date() }) {
    this.id = id;
    this.ticket_id = ticket_id;
    this.session_id = session_id;
    this.id_usuario = id_usuario;
    this.nombre_remitente = nombre_remitente;
    this.rol = rol; // 'user', 'bot', 'admin', 'soporte', 'system'
    this.mensaje = mensaje;
    this.leido = leido;
    this.fecha = fecha;
  }

  toJSON() {
    return {
      id: this.id,
      ticket_id: this.ticket_id,
      session_id: this.session_id,
      id_usuario: this.id_usuario,
      nombre_remitente: this.nombre_remitente,
      rol: this.rol,
      mensaje: this.mensaje,
      leido: this.leido,
      fecha: this.fecha
    };
  }
}

module.exports = MensajeChat;
