/**
 * Adaptador de Infraestructura: SocketHandler
 * Gestiona conexiones y salas de Socket.IO para soporte en vivo y chat
 */
class SocketHandler {
  constructor(io) {
    this.io = io;
    this.soporteNamespace = null;
    this.inicializar();
  }

  inicializar() {
    if (!this.io) return;

    this.soporteNamespace = this.io.of('/soporte');
    global.soporteIO = this.soporteNamespace;

    this.soporteNamespace.on('connection', (socket) => {
      socket.on('unirse_sala', ({ session_id, rol }) => {
        if (session_id) socket.join(session_id);
        if (rol === 'admin' || rol === 'soporte') {
          socket.join('admin_room');
        }
      });

      socket.on('escribiendo_cliente', ({ session_id }) => {
        this.soporteNamespace.to('admin_room').emit('cliente_escribiendo', { session_id });
      });

      socket.on('escribiendo_agente', ({ session_id }) => {
        if (session_id) {
          this.soporteNamespace.to(session_id).emit('agente_escribiendo');
        }
      });
    });

    console.log('🔌 Socket.IO Soporte inicializado correctamente');
  }

  emitirNuevoTicket(ticketData) {
    if (this.soporteNamespace) {
      this.soporteNamespace.to('admin_room').emit('ticket_creado', ticketData);
    }
  }

  emitirNuevoMensaje(sessionId, mensajeData) {
    if (this.soporteNamespace) {
      this.soporteNamespace.to('admin_room').emit('nuevo_mensaje_ticket', mensajeData);
      if (sessionId) {
        this.soporteNamespace.to(sessionId).emit('nuevo_mensaje_cliente', mensajeData);
      }
    }
  }

  emitirTicketCerrado(ticketId, sessionId, closeMsg) {
    if (this.soporteNamespace) {
      this.soporteNamespace.to('admin_room').emit('ticket_cerrado', { ticket_id: ticketId, session_id: sessionId });
      if (sessionId) {
        this.soporteNamespace.to(sessionId).emit('ticket_cerrado_cliente', {
          ticket_id: ticketId,
          mensaje: closeMsg
        });
      }
    }
  }
}

module.exports = SocketHandler;
