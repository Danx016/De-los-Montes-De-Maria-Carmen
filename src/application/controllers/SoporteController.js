/**
 * Controlador: SoporteController
 * Maneja tickets de soporte, interacción con IA de soporte, calificación y gestión de agentes
 */
const ProcessSupportAIChat = require('../../domain/use-cases/support/ProcessSupportAIChat');
const db = require('../../infrastructure/persistence/Database');

function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TK-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

class SoporteController {
  constructor({ soporteRepository, usuarioRepository, productoRepository, compraRepository, emailService, iaService, socketHandler, telegramService }) {
    this.soporteRepository = soporteRepository;
    this.usuarioRepository = usuarioRepository;
    this.productoRepository = productoRepository;
    this.compraRepository = compraRepository;
    this.emailService = emailService;
    this.iaService = iaService;
    this.socketHandler = socketHandler;
    this.telegramService = telegramService;
    this.processSupportAIChat = new ProcessSupportAIChat(iaService, {
      usuarioRepository,
      productoRepository,
      compraRepository
    });
  }

  async subirImagen(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    }
    const imageUrl = `/uploads/soporte/${req.file.filename}`;
    res.json({ ok: true, url: imageUrl });
  }

  async crearTicket(req, res) {
    try {
      let { nombre, correo, telefono, asunto, mensaje, session_id } = req.body;
      if (!nombre && req.user) nombre = req.user.nombre || req.user.username;
      if (!correo && req.user) correo = req.user.correo || req.user.email;
      nombre = nombre || 'Cliente';
      correo = correo || 'cliente@montesdemaria.com';
      telefono = telefono || 'Sin registrar';
      asunto = asunto || 'Consulta de soporte';

      const ticketCode = generateTicketCode();
      const sessionId = session_id || ('sess_' + Math.random().toString(36).substring(2, 11) + Date.now());
      const userId = (req.user && (req.user.id || req.user.id_usuario)) || null;

      const ticket = await this.soporteRepository.crearTicket({
        ticket_code: ticketCode,
        session_id: sessionId,
        id_usuario: userId,
        nombre_cliente: nombre,
        correo_cliente: correo,
        telefono_cliente: telefono,
        asunto,
        estado: 'bot'
      });

      const bienvenida = `¡Hola ${nombre}! 👋 Soy el asistente de soporte de **De los Montes de María**.\n\nHe registrado tu solicitud (**${ticketCode}**) sobre: **${asunto}**.\n\n¿En qué podemos colaborarte hoy?`;

      // Si el cliente envió un mensaje inicial, guardarlo primero
      if (mensaje && mensaje.trim()) {
        await this.soporteRepository.agregarMensaje({
          ticket_id: ticket.id,
          session_id: sessionId,
          id_usuario: userId,
          nombre_remitente: nombre,
          rol: 'user',
          mensaje: mensaje.trim()
        });
      }

      // Guardar mensaje de bienvenida del bot
      await this.soporteRepository.agregarMensaje({
        ticket_id: ticket.id,
        session_id: sessionId,
        id_usuario: null,
        nombre_remitente: 'Asistente Bot',
        rol: 'bot',
        mensaje: bienvenida
      });

      // Si había mensaje inicial, procesar respuesta de IA
      let respuestaBot = null;
      if (mensaje && mensaje.trim()) {
        try {
          respuestaBot = await this.processSupportAIChat.execute({
            session_id: sessionId,
            ticket,
            mensaje: mensaje.trim(),
            id_usuario: userId
          });
          if (respuestaBot) {
            await this.soporteRepository.agregarMensaje({
              ticket_id: ticket.id,
              session_id: sessionId,
              id_usuario: null,
              nombre_remitente: 'Asistente Bot',
              rol: 'bot',
              mensaje: respuestaBot
            });
          }
        } catch (e) {
          console.error('Error procesando respuesta IA inicial:', e);
        }
      }

      const ticketPayload = {
        id: ticket.id,
        ticket_code: ticketCode,
        session_id: sessionId,
        id_usuario: userId,
        nombre_cliente: nombre,
        correo_cliente: correo,
        telefono_cliente: telefono,
        asunto,
        estado: 'bot',
        created_at: new Date().toISOString()
      };

      if (this.socketHandler) {
        this.socketHandler.emitirNuevoTicket(ticketPayload);
      }

      // Notificar a Telegram de nuevo ticket
      if (this.telegramService) {
        this.telegramService.notificarNuevoTicket({
          ticket,
          mensajeInicial: mensaje || asunto,
        }).catch((tErr) => console.warn('[Telegram Ticket Alert Warning]:', tErr.message));
      }

      const mensajes = await this.soporteRepository.obtenerMensajes(ticket.id);

      res.json({
        ok: true,
        ticket: { ...ticketPayload, mensajes },
        ticketCode,
        ticketId: ticket.id,
        sessionId,
        bienvenida,
        mensajes
      });
    } catch (error) {
      console.error('Error al crear ticket:', error);
      res.status(500).json({ error: 'Error al crear el ticket.' });
    }
  }

  async enviarMensaje(req, res) {
    try {
      const { session_id, ticket_id, mensaje, remitente } = req.body;
      if ((!session_id && !ticket_id) || !mensaje || !mensaje.trim()) {
        return res.status(400).json({ error: 'Mensaje vacío.' });
      }

      const cleanMsg = mensaje.trim();
      let ticket = null;
      if (ticket_id) {
        ticket = await this.soporteRepository.buscarTicketPorId(ticket_id);
      } else if (session_id) {
        ticket = await this.soporteRepository.buscarTicketPorSessionId(session_id);
      }

      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });

      if (ticket.estado === 'cerrado') {
        return res.status(400).json({
          error: 'Este ticket ha sido marcado como resuelto y cerrado.',
          closed: true
        });
      }

      const isAgent = remitente === 'agente' || remitente === 'admin';
      const senderName = isAgent ? (req.user?.nombre || 'Asesor de Soporte') : (ticket.nombre_cliente || req.user?.nombre || 'Cliente');
      const rol = isAgent ? 'agente' : 'user';

      const msgSaved = await this.soporteRepository.agregarMensaje({
        ticket_id: ticket.id,
        session_id: ticket.session_id,
        id_usuario: req.user?.id || null,
        nombre_remitente: senderName,
        rol,
        mensaje: cleanMsg
      });

      if (this.socketHandler) {
        this.socketHandler.emitirNuevoMensaje(ticket.session_id, {
          id: msgSaved.id,
          ticket_id: ticket.id,
          session_id: ticket.session_id,
          remitente: rol,
          nombre_remitente: senderName,
          mensaje: cleanMsg,
          fecha: new Date().toISOString()
        });
      }

      if (isAgent) {
        await this.soporteRepository.actualizarTicket(ticket.id, {
          estado: 'agente',
          id_agente: req.user?.id || ticket.id_agente,
          nombre_agente: senderName
        });

        // Si el ticket proviene de Telegram (session_id: tg_CHATID_TIMESTAMP)
        if (ticket.session_id && ticket.session_id.startsWith('tg_') && this.telegramService) {
          const parts = ticket.session_id.split('_');
          const tgChatId = parts[1];
          if (tgChatId) {
            const advisorMsg = `👨‍🌾 <b>Asesor (${senderName}):</b>\n\n${cleanMsg}`;
            this.telegramService.sendMessage(tgChatId, advisorMsg)
              .catch((err) => console.warn('[Telegram Agent Forward Error]:', err.message));
          }
        }

        return res.json({ ok: true });
      }

      // Si el ticket ya está transferido a un agente o no está en modo bot, notificar a los admins de Telegram y no procesar con IA
      if (ticket.estado !== 'bot') {
        if (this.telegramService) {
          this.telegramService.notificarMensajeCliente({
            ticket,
            mensaje: cleanMsg,
            nombreRemitente: senderName
          }).catch((tErr) => console.warn('[Telegram Msg Alert Warning]:', tErr.message));
        }
        return res.json({ ok: true });
      }

      // Si el remitente es un cliente y el ticket está en modo bot
      const lowerMsg = cleanMsg.toLowerCase();
      const isEscalateRequest = /\b(humano|humana|agente|persona|asesor|asesora|operador|operadora|representante|alguien real|hablar con alguien|atenci[oó]n humana|soporte humano)\b/i.test(lowerMsg) ||
        lowerMsg.includes('asesor') ||
        lowerMsg.includes('humano') ||
        lowerMsg.includes('agente') ||
        lowerMsg.includes('hablar con un');

      if (isEscalateRequest) {
        await this.soporteRepository.actualizarTicket(ticket.id, { estado: 'agente' });
        const avisoPase = '🔔 He transferido tu consulta a la cola de atención prioritaria. Un asesor humano se conectará enseguida contigo en este chat.';
        await this.soporteRepository.agregarMensaje({
          ticket_id: ticket.id,
          session_id: ticket.session_id,
          id_usuario: null,
          nombre_remitente: 'Sistema',
          rol: 'sistema',
          mensaje: avisoPase
        });
        if (this.socketHandler) {
          this.socketHandler.emitirNuevoMensaje(ticket.session_id, {
            ticket_id: ticket.id,
            session_id: ticket.session_id,
            remitente: 'sistema',
            nombre_remitente: 'Sistema',
            mensaje: avisoPase,
            fecha: new Date().toISOString()
          });
        }
        if (this.telegramService) {
          this.telegramService.notificarSolicitudAsesorHumano({ ticket })
            .catch((tErr) => console.warn('[Telegram Asesor Alert Warning]:', tErr.message));
        }
        return res.json({ ok: true, transferido: true, escalated: true, reply: avisoPase, respuestaBot: avisoPase });
      }

      const respuestaBot = await this.processSupportAIChat.execute({
        session_id: ticket.session_id,
        ticket,
        mensaje: cleanMsg,
        id_usuario: req.user?.id || null
      });

      await this.soporteRepository.agregarMensaje({
        ticket_id: ticket.id,
        session_id: ticket.session_id,
        id_usuario: null,
        nombre_remitente: 'Asistente Bot',
        rol: 'bot',
        mensaje: respuestaBot
      });

      if (this.socketHandler) {
        this.socketHandler.emitirNuevoMensaje(ticket.session_id, {
          ticket_id: ticket.id,
          session_id: ticket.session_id,
          remitente: 'bot',
          nombre_remitente: 'Asistente Bot',
          mensaje: respuestaBot,
          fecha: new Date().toISOString()
        });
      }

      return res.json({ ok: true, respuestaBot, reply: respuestaBot });
    } catch (error) {
      console.error('Error en enviarMensaje:', error);
      res.status(500).json({ error: 'Error al procesar mensaje.' });
    }
  }

  async solicitarAgente(req, res) {
    try {
      const { ticket_id, session_id } = req.body;
      let ticket = null;
      if (ticket_id) ticket = await this.soporteRepository.buscarTicketPorId(ticket_id);
      else if (session_id) ticket = await this.soporteRepository.buscarTicketPorSessionId(session_id);
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });

      await this.soporteRepository.actualizarTicket(ticket.id, { estado: 'agente' });
      const aviso = '🔔 Has solicitado atención con un asesor humano. Te atenderemos en breve aquí mismo.';
      await this.soporteRepository.agregarMensaje({
        ticket_id: ticket.id,
        session_id: ticket.session_id,
        id_usuario: null,
        nombre_remitente: 'Sistema',
        rol: 'sistema',
        mensaje: aviso
      });
      if (this.socketHandler) {
        this.socketHandler.emitirNuevoMensaje(ticket.session_id, {
          ticket_id: ticket.id,
          session_id: ticket.session_id,
          remitente: 'sistema',
          nombre_remitente: 'Sistema',
          mensaje: aviso,
          fecha: new Date().toISOString()
        });
      }

      // Notificar a Telegram de asesor humano solicitado
      if (this.telegramService) {
        this.telegramService.notificarSolicitudAsesorHumano({ ticket })
          .catch((tErr) => console.warn('[Telegram Asesor Alert Warning]:', tErr.message));
      }

      res.json({ ok: true, mensaje: aviso });
    } catch (error) {
      res.status(500).json({ error: 'Error al solicitar asesor.' });
    }
  }

  async cerrarTicket(req, res) {
    try {
      const { ticket_id, session_id } = req.body;
      let ticket = null;
      if (ticket_id) ticket = await this.soporteRepository.buscarTicketPorId(ticket_id);
      else if (session_id) ticket = await this.soporteRepository.buscarTicketPorSessionId(session_id);
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });

      await this.soporteRepository.actualizarTicket(ticket.id, { estado: 'cerrado' });
      const aviso = '✅ El ticket ha sido cerrado y resuelto.';
      await this.soporteRepository.agregarMensaje({
        ticket_id: ticket.id,
        session_id: ticket.session_id,
        id_usuario: null,
        nombre_remitente: 'Sistema',
        rol: 'sistema',
        mensaje: aviso
      });
      if (this.socketHandler) {
        this.socketHandler.emitirTicketCerrado(ticket.session_id, ticket.id);
      }
      res.json({ ok: true, mensaje: 'Ticket cerrado exitosamente.' });
    } catch (error) {
      res.status(500).json({ error: 'Error al cerrar ticket.' });
    }
  }

  async calificar(req, res) {
    try {
      const { ticket_id, session_id, estrellas, calificacion, comentario } = req.body;
      const score = estrellas || calificacion;
      if (!score || score < 1 || score > 5) {
        return res.status(400).json({ error: 'Calificación inválida.' });
      }

      let ticket = null;
      if (ticket_id) ticket = await this.soporteRepository.buscarTicketPorId(ticket_id);
      else if (session_id) ticket = await this.soporteRepository.buscarTicketPorSessionId(session_id);

      const tId = ticket ? ticket.id : (ticket_id || 1);
      const sId = ticket ? ticket.session_id : (session_id || 'sess_default');

      await this.soporteRepository.crearCalificacion({
        ticket_id: tId,
        session_id: sId,
        id_agente: ticket?.id_agente || null,
        nombre_agente: ticket?.nombre_agente || 'Soporte Admin',
        estrellas: parseInt(score, 10),
        comentario: comentario || null
      });

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Error al guardar calificación.' });
    }
  }

  async buscar(req, res) {
    try {
      const q = req.query.q || '';
      const resultados = await this.soporteRepository.buscarTickets(q);
      for (const t of resultados) {
        t.mensajes = await this.soporteRepository.obtenerMensajes(t.id);
      }
      res.json({ tickets: resultados });
    } catch (error) {
      res.status(500).json({ error: 'Error al buscar tickets.' });
    }
  }

  async listarAgentes(req, res) {
    try {
      const dbUsers = await this.usuarioRepository.listarTodos();
      res.json(dbUsers.map(u => u.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al listar agentes.' });
    }
  }

  async asignarAgente(req, res) {
    try {
      const { id_usuario, es_agente } = req.body;
      const nuevoRol = es_agente ? 4 : 3;
      await this.usuarioRepository.actualizar(id_usuario, { id_rol: nuevoRol });
      res.json({ ok: true, id_usuario, nuevoRol });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar agente.' });
    }
  }

  async statsAgentes(req, res) {
    try {
      const stats = await this.soporteRepository.obtenerStatsAgentes();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener estadísticas.' });
    }
  }

  async todasCalificaciones(req, res) {
    try {
      const calificaciones = await this.soporteRepository.obtenerTodasCalificaciones();
      res.json({ calificaciones });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener calificaciones.' });
    }
  }
}

module.exports = SoporteController;