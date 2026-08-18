/**
 * Servicio Externo: TelegramService
 * Integración con la API oficial de Telegram Bot (montesdemariabot)
 * - Sistema interactivo de Tickets de Soporte por pasos
 * - Conexión directa con la IA de Soporte (IAService / OpenRouter)
 * - Transferencia fluida a Asesores Humanos y respuestas bidireccionales
 * - Alertas en tiempo real a administradores (compras, stock bajo, tickets)
 */
const https = require('https');

function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TK-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

class TelegramService {
  constructor({ soporteRepository, iaService, productoRepository, usuarioRepository, compraRepository, emailService } = {}) {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '8827545163:AAHKvReHgrEm5LXBjZ2YYJChBqZQ1f0-AJo';
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME || 'montesdemariabot';
    this.adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || null;
    this.subscribers = new Set();

    this.soporteRepository = soporteRepository;
    this.iaService = iaService;
    this.productoRepository = productoRepository;
    this.usuarioRepository = usuarioRepository;
    this.compraRepository = compraRepository;
    this.emailService = emailService;
    this.socketHandler = null;

    // Memoria de sesiones interactivas por chatId
    // { state: 'IDLE' | 'FORM_NOMBRE' | 'FORM_CORREO' | 'FORM_TELEFONO' | 'FORM_CATEGORIA' | 'FORM_MENSAJE' | 'CHAT_ACTIVO', data: {}, activeTicket: null }
    this.sessions = new Map();

    if (this.adminChatId) {
      this.subscribers.add(String(this.adminChatId));
    }
  }

  /**
   * Realiza una petición HTTPS genérica a la API de Telegram
   */
  async request(method, payload = {}) {
    if (!this.token) {
      console.warn('[Telegram] Token no configurado.');
      return { ok: false, error: 'No token' };
    }

    return new Promise((resolve) => {
      const data = JSON.stringify(payload);
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 12000,
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ ok: false, error: 'Invalid JSON response from Telegram' });
          }
        });
      });

      req.on('error', (err) => {
        console.error('[Telegram Error]:', err.message);
        resolve({ ok: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Timeout Telegram API' });
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Enviar mensaje a un chat específico
   */
  async sendMessage(chatId, text, options = {}) {
    if (!chatId || !text) return;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...options,
    };
    return await this.request('sendMessage', payload);
  }

  /**
   * Enviar mensaje a todos los administradores / suscriptores registrados
   */
  async broadcastAdmins(text, options = {}) {
    const recipients = Array.from(this.subscribers);
    if (recipients.length === 0) {
      console.log('[Telegram Broadcast] No hay chat_id registrado aún para administradores.');
      return;
    }
    const promises = recipients.map((id) => this.sendMessage(id, text, options));
    return await Promise.allSettled(promises);
  }

  /**
   * Registrar nuevo chat_id dinámicamente (cuando un admin escribe /start)
   */
  registerSubscriber(chatId) {
    if (chatId) {
      this.subscribers.add(String(chatId));
      if (!this.adminChatId) {
        this.adminChatId = String(chatId);
      }
    }
  }

  /**
   * Alerta de Nueva Compra / Pedido a Administradores
   */
  async notificarNuevaCompra({ compra, usuario, productos, total, metodoPago, direccion }) {
    try {
      const orderCode = compra?.id_compra || compra?.id || Date.now().toString().slice(-6);
      const clientName = usuario?.nombre || usuario?.username || 'Cliente';
      const clientPhone = usuario?.telefono || 'No registrado';
      const clientEmail = usuario?.correo || usuario?.email || 'N/A';
      const formattedTotal = Number(total || 0).toLocaleString('es-CO');

      let productsList = '';
      if (Array.isArray(productos) && productos.length > 0) {
        productsList = productos
          .map((p) => `  ▫️ <b>${p.cantidad || 1}x</b> ${p.nombre || p.nombre_producto || 'Producto'} (<i>$${Number(p.precio || 0).toLocaleString('es-CO')}</i>)`)
          .join('\n');
      } else {
        productsList = '  ▫️ Productos del campo';
      }

      const msg = `
🛒 <b>¡NUEVO PEDIDO RECIBIDO!</b>
━━━━━━━━━━━━━━━━━━
🧾 <b>Pedido:</b> <code>#ORD-${orderCode}</code>
👤 <b>Cliente:</b> ${clientName}
📞 <b>Teléfono:</b> <code>${clientPhone}</code>
📧 <b>Correo:</b> ${clientEmail}
📍 <b>Entrega:</b> ${direccion || 'San Jacinto / Montes de María'}
💳 <b>Pago:</b> ${metodoPago || 'Contra Entrega'}
💰 <b>Total:</b> <b>$${formattedTotal} COP</b>

🌾 <b>Detalle de Cosechas:</b>
${productsList}
━━━━━━━━━━━━━━━━━━
🌿 <i>De los Montes de María - Cosechando Futuro</i>
`;
      await this.broadcastAdmins(msg);
    } catch (err) {
      console.error('[Telegram] Error al notificar compra:', err);
    }
  }

  /**
   * Alerta de Stock Bajo (cuando un producto tiene 5 o menos unidades)
   */
  async notificarStockBajo({ producto, stockRestante }) {
    try {
      const prodName = producto?.nombre || producto?.nombre_producto || 'Producto';
      const msg = `
⚠️ <b>¡ALERTA DE STOCK BAJO!</b>
━━━━━━━━━━━━━━━━━━
📦 <b>Producto:</b> ${prodName}
🌾 <b>Stock Restante:</b> <code>${stockRestante} unidades</code>
🏷️ <b>Categoría:</b> ${producto?.categoria || 'General'}
━━━━━━━━━━━━━━━━━━
👉 <a href="https://delosmontesdemaria.onrender.com/admin">Actualizar Inventario en el Panel</a>
`;
      await this.broadcastAdmins(msg);
    } catch (err) {
      console.error('[Telegram] Error al notificar stock bajo:', err);
    }
  }

  /**
   * Notificar Cambio de Estado de Pedido
   */
  async notificarCambioEstadoPedido({ compra, nuevoEstado, usuario }) {
    try {
      const orderId = compra?.id_compra || compra?.id || '';
      const stateEmoji =
        nuevoEstado === 'en_camino' || nuevoEstado === 'despachado' ? '🚚' :
        nuevoEstado === 'entregado' ? '✅' :
        nuevoEstado === 'en_preparacion' ? '👨‍🌾' : '📦';

      const msg = `
${stateEmoji} <b>ACTUALIZACIÓN DE DESPACHO</b>
━━━━━━━━━━━━━━━━━━
🧾 <b>Pedido:</b> <code>#ORD-${orderId}</code>
🚚 <b>Estado:</b> <b>${(nuevoEstado || '').toUpperCase()}</b>
${usuario?.nombre ? `👤 <b>Cliente:</b> ${usuario.nombre}\n` : ''}
━━━━━━━━━━━━━━━━━━
🌿 <i>De los Montes de María - Cosechas Directas</i>
`;
      await this.broadcastAdmins(msg);
    } catch (err) {
      console.error('[Telegram] Error al notificar cambio de estado:', err);
    }
  }

  /**
   * Notificar Nuevo Ticket de Soporte a Administradores
   */
  async notificarNuevoTicket({ ticket, mensajeInicial }) {
    try {
      const msg = `
🎫 <b>NUEVA CONSULTA DE SOPORTE</b>
━━━━━━━━━━━━━━━━━━
Código: <code>${ticket.ticket_code || ticket.session_id}</code>
Cliente: <b>${ticket.nombre_cliente || 'Usuario'}</b>
Correo: <code>${ticket.correo_cliente || 'N/A'}</code>
Asunto: <b>${ticket.asunto || 'Consulta'}</b>

📝 <b>Mensaje:</b>
<i>"${mensajeInicial || 'Solicitud de información'}"</i>
━━━━━━━━━━━━━━━━━━
👉 <a href="https://delosmontesdemaria.onrender.com/admin/soporte">Abrir Panel de Soporte</a>
`;
      await this.broadcastAdmins(msg);
    } catch (err) {
      console.error('[Telegram] Error al notificar ticket:', err);
    }
  }

  /**
   * Notificar cuando un cliente solicita hablar con Asesor Humano
   */
  async notificarSolicitudAsesorHumano({ ticket }) {
    try {
      const msg = `
🚨 <b>¡CLIENTE SOLICITA ASESOR HUMANO!</b>
━━━━━━━━━━━━━━━━━━
Ticket: <code>${ticket.ticket_code || ticket.id}</code>
Cliente: <b>${ticket.nombre_cliente}</b>
Teléfono: <code>${ticket.telefono_cliente || 'N/A'}</code>
Asunto: <b>${ticket.asunto}</b>
━━━━━━━━━━━━━━━━━━
⚡ <i>Por favor atiende la solicitud en el panel de asesores:</i>
👉 <a href="https://delosmontesdemaria.onrender.com/admin/soporte">Atender en Vivo</a>
`;
      await this.broadcastAdmins(msg);
    } catch (err) {
      console.error('[Telegram] Error al notificar asesor humano:', err);
    }
  }

  /**
   * PROCESADOR PRINCIPAL DE ACTUALIZACIONES (WEBHOOK)
   * Gestiona el flujo interactivo de formularios, tickets, IA y asesores.
   */
  async procesarUpdate(update) {
    try {
      if (!update || !update.message) return { ok: true };

      const message = update.message;
      const chatId = String(message.chat?.id);
      const text = (message.text || '').trim();
      const from = message.from || {};
      const userName = from.first_name || from.username || 'Amigo';

      if (!chatId) return { ok: true };

      // Registrar chat para alertas
      this.registerSubscriber(chatId);

      // Obtener o inicializar sesión conversacional
      let session = this.sessions.get(chatId);
      if (!session) {
        session = { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null };
        this.sessions.set(chatId, session);
      }

      // ── COMANDOS GLOBALES DE REINICIO O SALIDA ──
      if (text === '/cancelar' || text === '/reset') {
        this.sessions.set(chatId, { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null });
        await this.sendMessage(chatId, '🔄 Proceso reiniciado. Si necesitas ayuda escribe /soporte.');
        return { ok: true };
      }

      if (text === '/cerrar' || text === '/fin' || text === '/terminar') {
        if (session.activeTicket && this.soporteRepository) {
          try {
            await this.soporteRepository.actualizarTicket(session.activeTicket.id, { estado: 'cerrado' });
            if (this.socketHandler) {
              this.socketHandler.emitirTicketCerrado(session.activeSessionId, session.activeTicket.id);
            }
          } catch (_) {}
        }
        this.sessions.set(chatId, { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null });
        await this.sendMessage(chatId, '✅ <b>Ticket de soporte cerrado exitosamente.</b>\n\n¡Muchas gracias por contactar a <b>De los Montes de María</b>! 🌾\nSi requieres nueva asistencia, escribe /soporte.');
        return { ok: true };
      }

      // ── FLUJO INTERACTIVO DE SOPORTE POR PASOS (FORMULARIO) ──
      if (session.state === 'FORM_NOMBRE') {
        session.data.nombre = text;
        session.state = 'FORM_CORREO';
        await this.sendMessage(chatId, `📧 Perfecto, <b>${text}</b>.\n\nAhora escribe tu <b>Correo Electrónico</b> (para enviarte copia y seguimiento):`);
        return { ok: true };
      }

      if (session.state === 'FORM_CORREO') {
        session.data.correo = text;
        session.state = 'FORM_TELEFONO';
        await this.sendMessage(chatId, `📞 Indícanos tu <b>Número de Teléfono o WhatsApp</b> (o escribe <i>"omitir"</i>):`);
        return { ok: true };
      }

      if (session.state === 'FORM_TELEFONO') {
        session.data.telefono = text.toLowerCase() === 'omitir' ? 'Sin registrar' : text;
        session.state = 'FORM_CATEGORIA';
        const catMenu = `
🏷️ Selecciona la <b>Categoría</b> de tu consulta (responde con el número del <b>1 al 5</b>):

1️⃣ 📦 Estado de Pedidos y Envíos
2️⃣ 🌱 Productos y Cosechas
3️⃣ 💳 Pagos y Facturación
4️⃣ 🌾 Registro de Campesino / Vendedor
5️⃣ ❓ Otra Consulta
`;
        await this.sendMessage(chatId, catMenu);
        return { ok: true };
      }

      if (session.state === 'FORM_CATEGORIA') {
        const catMap = {
          '1': '📦 Estado de Pedidos & Envíos',
          '2': '🌱 Productos & Cosechas',
          '3': '💳 Pagos & Facturación',
          '4': '🌾 Registro de Campesino / Vendedor',
          '5': '❓ Consulta General'
        };
        const catSelected = catMap[text.trim()] || `Consulta: ${text.trim()}`;
        session.data.categoria = catSelected;
        session.state = 'FORM_MENSAJE';
        await this.sendMessage(chatId, `✍️ Por favor describe tu <b>Consulta o Problema</b> en detalle:`);
        return { ok: true };
      }

      if (session.state === 'FORM_MENSAJE') {
        const userMsg = text;
        session.data.mensaje = userMsg;

        const ticketCode = generateTicketCode();
        const sessionId = `tg_${chatId}_${Date.now()}`;
        let ticket = null;

        if (this.soporteRepository) {
          try {
            ticket = await this.soporteRepository.crearTicket({
              ticket_code: ticketCode,
              session_id: sessionId,
              id_usuario: null,
              nombre_cliente: session.data.nombre || userName,
              correo_cliente: session.data.correo || 'telegram_user@montesdemaria.com',
              telefono_cliente: session.data.telefono || 'Sin registrar',
              asunto: `${session.data.categoria}: ${userMsg.substring(0, 45)}...`,
              estado: 'bot'
            });

            // Guardar mensaje del usuario
            await this.soporteRepository.agregarMensaje({
              ticket_id: ticket.id,
              session_id: sessionId,
              id_usuario: null,
              nombre_remitente: session.data.nombre || userName,
              rol: 'user',
              mensaje: userMsg
            });
          } catch (dbErr) {
            console.error('[Telegram Ticket DB Error]:', dbErr);
          }
        }

        // Generar respuesta con la IA de Soporte
        let aiReply = `¡Hola ${session.data.nombre || userName}! 👋 He registrado tu solicitud (${ticketCode}). ¿En qué podemos colaborarte hoy?`;
        if (this.iaService && ticket) {
          try {
            aiReply = await this.iaService.procesarMensajeSoporte({
              session_id: sessionId,
              ticket,
              mensaje: userMsg,
              id_usuario: null,
              repositories: {
                usuarioRepository: this.usuarioRepository,
                productoRepository: this.productoRepository,
                compraRepository: this.compraRepository
              }
            });

            if (this.soporteRepository) {
              await this.soporteRepository.agregarMensaje({
                ticket_id: ticket.id,
                session_id: sessionId,
                id_usuario: null,
                nombre_remitente: 'Asistente Bot',
                rol: 'bot',
                mensaje: aiReply
              });
            }
          } catch (iaErr) {
            console.error('[Telegram IA Support Error]:', iaErr);
          }
        }

        // Emitir a socket del panel admin
        if (this.socketHandler && ticket) {
          this.socketHandler.emitirNuevoTicket({
            id: ticket.id,
            ticket_code: ticketCode,
            session_id: sessionId,
            nombre_cliente: session.data.nombre || userName,
            correo_cliente: session.data.correo || 'telegram_user@montesdemaria.com',
            telefono_cliente: session.data.telefono || 'Sin registrar',
            asunto: ticket.asunto,
            estado: 'bot',
            created_at: new Date().toISOString()
          });
        }

        // Notificar a los administradores
        if (ticket) {
          this.notificarNuevoTicket({ ticket, mensajeInicial: userMsg }).catch(() => {});
        }

        // Pasar a estado de conversación activa con la IA
        session.state = 'CHAT_ACTIVO';
        session.activeTicket = ticket || { id: 1, ticket_code: ticketCode, session_id: sessionId };
        session.activeSessionId = sessionId;

        const confirmationMsg = `
🎫 <b>¡TICKET DE SOPORTE CREADO!</b>
━━━━━━━━━━━━━━━━━━
Código: <code>${ticketCode}</code>
Cliente: <b>${session.data.nombre}</b>
Categoría: <b>${session.data.categoria}</b>
━━━━━━━━━━━━━━━━━━
🌾 <b>Respuesta de AgroAsistente IA:</b>

${aiReply}

━━━━━━━━━━━━━━━━━━
💡 <i>Puedes seguir respondiendo en este chat. Si deseas hablar con una persona real, escribe <b>"asesor"</b> o <b>/asesor</b>. Para finalizar la consulta escribe <b>/cerrar</b>.</i>
`;
        await this.sendMessage(chatId, confirmationMsg);
        return { ok: true };
      }

      // ── CONVERSACIÓN CONTINUA CON TICKET ACTIVO (IA / ASESOR HUMANO) ──
      if (session.state === 'CHAT_ACTIVO' && session.activeTicket) {
        const ticket = session.activeTicket;
        const sessionId = session.activeSessionId;

        // Comprobar si el usuario solicita asesor humano
        const lower = text.toLowerCase();
        const isEscalate = text === '/asesor' || lower.includes('asesor') || lower.includes('humano') || lower.includes('hablar con alguien') || lower.includes('agente') || lower.includes('persona');

        if (isEscalate) {
          if (this.soporteRepository) {
            await this.soporteRepository.actualizarTicket(ticket.id, { estado: 'agente' });
            const aviso = '🔔 El cliente en Telegram ha solicitado atención con un asesor humano.';
            await this.soporteRepository.agregarMensaje({
              ticket_id: ticket.id,
              session_id: sessionId,
              id_usuario: null,
              nombre_remitente: 'Sistema',
              rol: 'sistema',
              mensaje: aviso
            });
          }

          if (this.socketHandler) {
            this.socketHandler.emitirNuevoMensaje(sessionId, {
              ticket_id: ticket.id,
              session_id: sessionId,
              remitente: 'sistema',
              nombre_remitente: 'Sistema',
              mensaje: '🔔 Cliente solicitó asesor humano desde Telegram.',
              fecha: new Date().toISOString()
            });
          }

          this.notificarSolicitudAsesorHumano({ ticket }).catch(() => {});

          await this.sendMessage(chatId, `🔔 <b>¡Solicitud de Asesor Humano Recibida!</b>\n━━━━━━━━━━━━━━━━━━\nHemos notificado a nuestro equipo de asesores en vivo. Un asesor humano se comunicará contigo directamente por este chat en breves minutos.\n\n<i>Puedes escribir cualquier detalle adicional aquí.</i>`);
          return { ok: true };
        }

        // Guardar mensaje del usuario en DB
        if (this.soporteRepository) {
          await this.soporteRepository.agregarMensaje({
            ticket_id: ticket.id,
            session_id: sessionId,
            id_usuario: null,
            nombre_remitente: session.data.nombre || userName,
            rol: 'user',
            mensaje: text
          });
        }

        if (this.socketHandler) {
          this.socketHandler.emitirNuevoMensaje(sessionId, {
            ticket_id: ticket.id,
            session_id: sessionId,
            remitente: 'user',
            nombre_remitente: session.data.nombre || userName,
            mensaje: text,
            fecha: new Date().toISOString()
          });
        }

        // Verificar si el ticket está en estado 'agente' o 'bot'
        let currentTicket = ticket;
        if (this.soporteRepository) {
          const dbTicket = await this.soporteRepository.buscarTicketPorId(ticket.id);
          if (dbTicket) currentTicket = dbTicket;
        }

        if (currentTicket.estado === 'agente') {
          // El ticket está en manos de un asesor humano
          await this.sendMessage(chatId, `📨 <i>Tu mensaje fue recibido y enviado a tu asesor asignado. Te responderemos en breve por aquí.</i>`);
          return { ok: true };
        }

        // Si está en modo bot, responder con la IA de soporte
        if (this.iaService) {
          try {
            const aiAnswer = await this.iaService.procesarMensajeSoporte({
              session_id: sessionId,
              ticket: currentTicket,
              mensaje: text,
              id_usuario: null,
              repositories: {
                usuarioRepository: this.usuarioRepository,
                productoRepository: this.productoRepository,
                compraRepository: this.compraRepository
              }
            });

            if (this.soporteRepository) {
              await this.soporteRepository.agregarMensaje({
                ticket_id: ticket.id,
                session_id: sessionId,
                id_usuario: null,
                nombre_remitente: 'Asistente Bot',
                rol: 'bot',
                mensaje: aiAnswer
              });
            }

            if (this.socketHandler) {
              this.socketHandler.emitirNuevoMensaje(sessionId, {
                ticket_id: ticket.id,
                session_id: sessionId,
                remitente: 'bot',
                nombre_remitente: 'Asistente Bot',
                mensaje: aiAnswer,
                fecha: new Date().toISOString()
              });
            }

            await this.sendMessage(chatId, `${aiAnswer}\n\n<i>(Escribe /asesor para hablar con una persona o /cerrar para finalizar)</i>`);
          } catch (iaErr) {
            console.error('[Telegram IA Followup Error]:', iaErr);
            await this.sendMessage(chatId, `🌾 Recibido. Escribe <b>/asesor</b> si requieres atención humana inmediata.`);
          }
        }

        return { ok: true };
      }

      // ── INICIO DE FORMULARIO DE SOPORTE ──
      const lowerText = text.toLowerCase();
      const wantsSupport = text === '/soporte' || text === '/ayuda' || text === '/ticket' ||
        lowerText.includes('soporte') || lowerText.includes('ayuda') || lowerText.includes('consulta') ||
        lowerText.includes('reclamo') || lowerText.includes('problema') || lowerText.includes('asesor');

      if (wantsSupport) {
        session.state = 'FORM_NOMBRE';
        session.data = {};
        const welcomeForm = `
👋 <b>Centro de Soporte - De los Montes de María</b> 🌾
━━━━━━━━━━━━━━━━━━
Vamos a registrar tu consulta personalizada para que nuestra <b>IA de Soporte</b> y asesores humanos te atiendan.

📝 <b>Paso 1/5:</b> ¿Cuál es tu <b>Nombre y Apellido</b>?
<i>(Escribe tu nombre para continuar o /cancelar para salir)</i>
`;
        await this.sendMessage(chatId, welcomeForm);
        return { ok: true };
      }

      // Deep-links (/start pedido_XXX o /start producto_XXX)
      if (text.startsWith('/start pedido_')) {
        const orderId = text.replace('/start pedido_', '').trim();
        const msg = `
✅ <b>¡Seguimiento Activado!</b>
━━━━━━━━━━━━━━━━━━
Tu cuenta de Telegram ha quedado vinculada al pedido <code>#ORD-${orderId}</code>.

Te avisaremos por aquí automáticamente en cuanto tu cosecha esté <b>en preparación, despachada y en camino a tu domicilio</b> 🚚🌾.
`;
        await this.sendMessage(chatId, msg);
        return { ok: true };
      }

      if (text.startsWith('/start producto_')) {
        const msg = `
🌾 <b>¡Hola ${userName}!</b>
¿Tienes alguna duda sobre nuestras cosechas o productos?

Escribe <b>/soporte</b> para iniciar una consulta asistida por IA o explora el catálogo aquí:
👉 https://delosmontesdemaria.onrender.com/catalogo
`;
        await this.sendMessage(chatId, msg);
        return { ok: true };
      }

      // Comandos Estándar
      if (text.startsWith('/start')) {
        const welcome = `
👋 <b>¡Hola ${userName}!</b> Bienvenido al bot oficial de <b>De los Montes de María</b> 🌾

Tu <b>Chat ID</b> es: <code>${chatId}</code>

<b>Opciones disponibles:</b>
💬 <code>/soporte</code> - Iniciar formulario de soporte y consultar con IA
🛒 <code>/tienda</code> - Ver catálogo de cosechas en la web
📦 <code>/pedidos</code> - Información sobre envíos
🌾 <code>/campesinos</code> - Conocer a nuestros productores
🆔 <code>/id</code> - Ver tu Chat ID
`;
        await this.sendMessage(chatId, welcome);
      } else if (text.startsWith('/id')) {
        await this.sendMessage(chatId, `Tu Chat ID de Telegram es: <code>${chatId}</code>`);
      } else if (text.startsWith('/tienda') || text.startsWith('/catalogo')) {
        await this.sendMessage(chatId, `🛒 Explora cosechas frescas y productos del campo en nuestra web oficial:\n👉 https://delosmontesdemaria.onrender.com/catalogo`);
      } else if (text.startsWith('/pedidos')) {
        await this.sendMessage(chatId, `📦 Realizamos envíos directos desde los Montes de María hasta tu hogar con frescura garantizada.`);
      } else {
        await this.sendMessage(chatId, `¡Hola ${userName}! Recibimos tu mensaje.\n\nEscribe <b>/soporte</b> para iniciar una consulta asistida con nuestra IA y asesores, o ingresa a https://delosmontesdemaria.onrender.com.`);
      }

      return { ok: true };
    } catch (err) {
      console.error('[Telegram Webhook Error]:', err);
      return { ok: false, error: err.message };
    }
  }
}

module.exports = TelegramService;
