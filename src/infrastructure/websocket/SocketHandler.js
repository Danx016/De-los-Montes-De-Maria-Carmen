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

  emitirTicketCerrado(arg1, arg2, closeMsg) {
    if (!this.soporteNamespace) return;

    let sessionId = null;
    let ticketId = null;

    if (typeof arg1 === 'string' && (arg1.startsWith('sess_') || arg1.startsWith('tg_') || isNaN(Number(arg1)))) {
      sessionId = arg1;
      ticketId = arg2;
    } else if (typeof arg2 === 'string' && (arg2.startsWith('sess_') || arg2.startsWith('tg_') || isNaN(Number(arg2)))) {
      sessionId = arg2;
      ticketId = arg1;
    } else {
      sessionId = arg1;
      ticketId = arg2;
    }

    const payload = {
      ticketId,
      ticket_id: ticketId,
      sessionId,
      session_id: sessionId,
      mensaje: closeMsg || 'El ticket ha sido cerrado y resuelto por el equipo de soporte.'
    };

    this.soporteNamespace.to('admin_room').emit('ticket_cerrado', payload);
    if (sessionId) {
      this.soporteNamespace.to(sessionId).emit('ticket_cerrado_cliente', payload);
    }
  }
}

module.exports = SocketHandler;
