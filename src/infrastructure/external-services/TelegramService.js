/**
 * Servicio Externo: TelegramService
 * Integración con la API oficial de Telegram Bot (montesdemariabot)
 * - Sistema interactivo de Tickets de Soporte por pasos
 * - Conexión directa con la IA de Soporte (IAService / OpenRouter)
 * - Transferencia fluida a Asesores Humanos y respuestas bidireccionales
 * - Alertas en tiempo real a administradores (compras, stock bajo, tickets)
 */
const https = require('https');
const bcrypt = require('bcrypt');

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
    // { state: 'IDLE' | 'FORM_NOMBRE' | 'FORM_CORREO' | 'FORM_TELEFONO' | 'FORM_CATEGORIA' | 'FORM_MENSAJE' | 'CHAT_ACTIVO' | 'LOGIN_WAIT_EMAIL' | 'LOGIN_WAIT_CODE', data: {}, activeTicket: null }
    this.sessions = new Map();

    // Memoria de usuarios autenticados: chatId -> { id_usuario, nombre, apodo, correo, telefono, id_rol, rolNombre }
    this.authenticatedUsers = new Map();

    // Memoria de códigos OTP pendientes: chatId -> { code, userObj, expiresAt }
    this.pendingAuth = new Map();

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
   * Generar menú interactivo según el rol del usuario autenticado
   */
  generarMenuRol(authUser, chatId) {
    if (!authUser) {
      return `
👋 <b>¡Bienvenido al Bot de De los Montes de María!</b> 🌾
━━━━━━━━━━━━━━━━━━
Tu <b>Chat ID:</b> <code>${chatId}</code>
Estado: 👤 <i>Usuario Invitado</i>

🔐 <b>Conecta tu cuenta para desbloquear funciones:</b>
👉 Escribe <code>/login</code>

<b>Comandos generales:</b>
💬 <code>/soporte</code> - Consulta con IA y soporte humano
🛒 <code>/tienda</code> - Catálogo de cosechas y productos
📦 <code>/pedidos</code> - Información sobre envíos
🆔 <code>/id</code> - Ver tu Chat ID
`;
    }

    const rolId = Number(authUser.id_rol);
    const nombre = authUser.nombre || authUser.username || 'Usuario';

    // 1. Administrador (id_rol = 1) o Asesor (id_rol = 4)
    if (rolId === 1 || rolId === 4) {
      const badge = rolId === 1 ? '👑 ADMINISTRADOR' : '👨‍🌾 ASESOR DE SOPORTE';
      return `
🌾 <b>PANEL DE CONTROL TELEGRAM</b> 🌾
━━━━━━━━━━━━━━━━━━
👤 <b>Sesión:</b> ${nombre} (${badge})
📧 <b>Correo:</b> <code>${authUser.correo}</code>
━━━━━━━━━━━━━━━━━━
<b>Comandos de Gestión:</b>
📊 <code>/admin</code> o <code>/resumen</code> - Métricas en tiempo real
🎫 <code>/tickets</code> - Lista de tickets pendientes
💬 <code>/responder [CÓDIGO] [MENSAJE]</code> - Responder a un cliente
🔒 <code>/cerrarticket [CÓDIGO]</code> - Finalizar un ticket
🛒 <code>/ventas</code> - Últimas ventas registradas
📦 <code>/stock</code> - Inventario y alertas de stock bajo
🌾 <code>/misproductos</code> - Cosechas activas en el catálogo
👤 <code>/perfil</code> - Datos de tu cuenta
🚪 <code>/logout</code> - Cerrar sesión en Telegram

💡 <i>Consejo: Para responder a un cliente rápidamente, desliza/cita el mensaje de alerta de soporte en Telegram y escribe tu respuesta directamente.</i>
`;
    }

    // 2. Campesino / Vendedor (id_rol = 2)
    if (rolId === 2) {
      return `
🌱 <b>PANEL DE PRODUCTOR CAMPESINO</b> 🌱
━━━━━━━━━━━━━━━━━━
👨‍🌾 <b>Productor:</b> ${nombre}
📧 <b>Correo:</b> <code>${authUser.correo}</code>
━━━━━━━━━━━━━━━━━━
<b>Tus Herramientas:</b>
🌾 <code>/misproductos</code> - Ver tus cosechas publicadas y stock
💰 <code>/misventas</code> - Resumen de pedidos de tus cosechas
💬 <code>/soporte</code> - Contactar asistencia directa
🛒 <code>/tienda</code> - Ver catálogo general
👤 <code>/perfil</code> - Datos de tu cuenta
🚪 <code>/logout</code> - Cerrar sesión en Telegram
`;
    }

    // 3. Comprador / Cliente (id_rol = 3)
    return `
🛒 <b>PANEL DEL COMPRADOR</b> 🛒
━━━━━━━━━━━━━━━━━━
👤 <b>Hola:</b> ${nombre}
📧 <b>Correo:</b> <code>${authUser.correo}</code>
━━━━━━━━━━━━━━━━━━
<b>Tus Opciones:</b>
📦 <code>/mispedidos</code> - Consultar tus compras y estado de envío
💬 <code>/soporte</code> - Consulta rápida (tus datos ya están listos)
🛒 <code>/tienda</code> - Ver catálogo de cosechas frescas
👤 <code>/perfil</code> - Datos de tu cuenta
🚪 <code>/logout</code> - Cerrar sesión en Telegram
`;
  }

  /**
   * Responder a un ticket desde Telegram (por Admin o Asesor)
   */
  async responderTicket(chatId, ticketCode, replyText, authUser) {
    if (!this.soporteRepository) {
      await this.sendMessage(chatId, '❌ El repositorio de soporte no está disponible.');
      return;
    }

    try {
      const cleanCode = ticketCode.toUpperCase().trim();
      const ticket = await this.soporteRepository.buscarTicketPorCodigo(cleanCode);

      if (!ticket) {
        await this.sendMessage(chatId, `❌ No se encontró ningún ticket con el código <code>${cleanCode}</code>.`);
        return;
      }

      const nombreAsesor = authUser?.nombre || authUser?.username || 'Equipo de Soporte';
      const idUsuario = authUser?.id_usuario || null;

      // 1. Guardar mensaje en la base de datos
      await this.soporteRepository.agregarMensaje({
        ticket_id: ticket.id,
        session_id: ticket.session_id,
        id_usuario: idUsuario,
        nombre_remitente: nombreAsesor,
        rol: 'agente',
        mensaje: replyText,
        leido: 0
      });

      // 2. Actualizar estado del ticket a agente asignado
      await this.soporteRepository.actualizarTicket(ticket.id, {
        estado: 'agente',
        nombre_agente: nombreAsesor,
        id_agente: idUsuario
      });

      // 3. Emitir por Socket.IO al panel web en tiempo real
      if (this.socketHandler) {
        this.socketHandler.emitirNuevoMensaje(ticket.session_id, {
          ticket_id: ticket.id,
          session_id: ticket.session_id,
          remitente: 'agente',
          nombre_remitente: nombreAsesor,
          mensaje: replyText,
          fecha: new Date().toISOString()
        });
      }

      // 4. Si el ticket fue creado por un usuario desde Telegram, reenviarle la respuesta
      if (ticket.session_id && ticket.session_id.startsWith('tg_')) {
        const parts = ticket.session_id.split('_');
        const clientChatId = parts[1];
        if (clientChatId) {
          const clientMsg = `
👨‍🌾 <b>Asesor (${nombreAsesor}):</b>
━━━━━━━━━━━━━━━━━━
${replyText}
━━━━━━━━━━━━━━━━━━
<i>Puedes responder directamente en este chat para continuar la conversación.</i>
`;
          await this.sendMessage(clientChatId, clientMsg);
        }
      }

      // 5. Confirmar al Admin/Asesor que envió el mensaje
      await this.sendMessage(
        chatId,
        `✅ <b>Respuesta enviada con éxito al cliente</b>\n━━━━━━━━━━━━━━━━━━\n🎫 <b>Ticket:</b> <code>#${cleanCode}</code>\n👤 <b>Cliente:</b> ${ticket.nombre_cliente}\n📝 <b>Mensaje:</b> <i>"${replyText}"</i>`
      );
    } catch (err) {
      console.error('[Telegram responderTicket Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al enviar respuesta: ${err.message}`);
    }
  }

  /**
   * PROCESADOR PRINCIPAL DE ACTUALIZACIONES (WEBHOOK)
   * Gestiona el flujo interactivo de formularios, tickets, IA y asesores.
   */
  async procesarUpdate(update) {
    try {
      if (!update) return { ok: true };

      // ── MANEJO DE BOTONES INTERACTIVOS (CALLBACK QUERIES) ──
      if (update.callback_query) {
        const cb = update.callback_query;
        const cbChatId = String(cb.message?.chat?.id || cb.from?.id);
        const cbData = cb.data || '';

        if (cbData === 'resend_otp') {
          await this.reenviarCodigoOTP(cbChatId);
          if (cb.id) {
            await this.request('answerCallbackQuery', {
              callback_query_id: cb.id,
              text: '📧 ¡Nuevo código enviado a tu correo!'
            }).catch(() => {});
          }
          return { ok: true };
        }
        return { ok: true };
      }

      if (!update.message) return { ok: true };

      const message = update.message;
      const chatId = String(message.chat?.id);
      const text = (message.text || '').trim();
      const from = message.from || {};
      const userName = from.first_name || from.username || 'Amigo';

      if (!chatId) return { ok: true };

      // Registrar chat para alertas base
      this.registerSubscriber(chatId);

      // Obtener o inicializar sesión conversacional
      let session = this.sessions.get(chatId);
      if (!session) {
        session = { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null };
        this.sessions.set(chatId, session);
      }

      const authUser = this.authenticatedUsers.get(chatId) || null;
      const rolId = authUser ? Number(authUser.id_rol) : null;
      const isAdminOrAdvisor = rolId === 1 || rolId === 4;

      // ── RESPUESTA CITADA / SWIPE-TO-REPLY (PARA ADMINS Y ASESORES) ──
      if (message.reply_to_message && text && (isAdminOrAdvisor || chatId === String(this.adminChatId))) {
        const quotedText = message.reply_to_message.text || '';
        const ticketMatch = quotedText.match(/TK-[A-Z0-9]{6}/i) || quotedText.match(/#([A-Z0-9]{6,8})/i);
        if (ticketMatch) {
          const ticketCode = ticketMatch[0].replace('#', '');
          await this.responderTicket(chatId, ticketCode, text, authUser);
          return { ok: true };
        }
      }

      // ── COMANDOS GLOBALES DE REINICIO O SALIDA ──
      if (text === '/cancelar' || text === '/reset') {
        this.sessions.set(chatId, { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null });
        this.pendingAuth.delete(chatId);
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

      // ── GESTIÓN DE SESIÓN Y AUTENTICACIÓN (/LOGIN, /LOGOUT, /PERFIL) ──
      if (text === '/logout' || text === '/desconectar' || text === '/salir') {
        this.authenticatedUsers.delete(chatId);
        this.pendingAuth.delete(chatId);
        this.sessions.set(chatId, { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null });
        await this.sendMessage(chatId, '👋 <b>Sesión cerrada exitosamente.</b>\nHas vuelto al modo invitado. Escribe /login cuando desees volver a identificarte.');
        return { ok: true };
      }

      if (text === '/perfil' || text === '/cuenta' || text === '/mi_cuenta') {
        if (!authUser) {
          await this.sendMessage(chatId, '🔒 No has iniciado sesión.\nEscribe <code>/login</code> para vincular tu cuenta.');
        } else {
          const rolTexto = rolId === 1 ? '👑 Administrador' : rolId === 2 ? '🌾 Campesino / Vendedor' : rolId === 4 ? '👨‍🌾 Asesor de Soporte' : '🛒 Comprador / Cliente';
          const perfilMsg = `
👤 <b>PERFIL DE USUARIO</b>
━━━━━━━━━━━━━━━━━━
📛 <b>Nombre:</b> ${authUser.nombre || authUser.username}
📧 <b>Correo:</b> <code>${authUser.correo}</code>
📞 <b>Teléfono:</b> <code>${authUser.telefono || 'Sin registrar'}</code>
🏷️ <b>Rol:</b> <b>${rolTexto}</b>
🆔 <b>Chat ID:</b> <code>${chatId}</code>
━━━━━━━━━━━━━━━━━━
<i>Para cerrar tu sesión escribe /logout.</i>
`;
          await this.sendMessage(chatId, perfilMsg);
        }
        return { ok: true };
      }

      // Iniciar proceso de Login
      if (text.startsWith('/login') || text.startsWith('/conectar') || text.startsWith('/identificar')) {
        const parts = text.split(' ');
        const emailArg = parts[1] ? parts[1].trim() : '';

        if (emailArg && emailArg.includes('@')) {
          await this.iniciarLoginConEmail(chatId, emailArg, session);
        } else {
          session.state = 'LOGIN_WAIT_EMAIL';
          await this.sendMessage(chatId, '📧 Por favor escribe tu <b>Correo Electrónico</b> registrado en De los Montes de María:\n<i>(O escribe /cancelar para salir)</i>');
        }
        return { ok: true };
      }

      if (session.state === 'LOGIN_WAIT_EMAIL') {
        const emailInput = text.trim();
        if (!emailInput.includes('@') || !emailInput.includes('.')) {
          await this.sendMessage(chatId, '⚠️ Correo no válido. Por favor escribe un correo electrónico válido (ej: <code>correo@gmail.com</code>) o escribe /cancelar.');
          return { ok: true };
        }
        await this.iniciarLoginConEmail(chatId, emailInput, session);
        return { ok: true };
      }

      if (session.state === 'LOGIN_WAIT_CODE' || session.state === 'LOGIN_WAIT_AUTH') {
        const lower = text.toLowerCase();
        if (lower === '/reenviar' || lower === 'reenviar' || lower === 'reenviar codigo' || lower === '/resend' || lower === '/codigo') {
          await this.reenviarCodigoOTP(chatId);
          return { ok: true };
        }

        const pending = this.pendingAuth.get(chatId);
        const user = pending?.userObj || session.data?.authUser || null;

        if (!user) {
          session.state = 'IDLE';
          await this.sendMessage(chatId, '⚠️ Tu solicitud de inicio de sesión expiró. Escribe <b>/login</b> para intentarlo nuevamente.');
          return { ok: true };
        }

        let loginSuccess = false;

        // 1. Probar si ingresó el código OTP numérico de 6 dígitos
        const cleanDigits = text.replace(/\D/g, '').trim();
        if (pending && cleanDigits.length === 6 && cleanDigits === pending.code) {
          if (Date.now() <= pending.expiresAt) {
            loginSuccess = true;
          } else {
            await this.sendMessage(chatId, '⌛ El código de 6 dígitos ha vencido. Puedes escribir tu <b>contraseña de la web</b> para entrar directo o escribir /reenviar para recibir un código nuevo.');
            return { ok: true };
          }
        }

        // 2. Si no fue código OTP, probar si ingresó la contraseña del usuario (Bcrypt)
        if (!loginSuccess && user.contrasena) {
          try {
            const passwordMatch = await bcrypt.compare(text, user.contrasena);
            if (passwordMatch) {
              loginSuccess = true;
              // Eliminar el mensaje de Telegram que contenía la contraseña por seguridad
              if (message.message_id) {
                this.request('deleteMessage', {
                  chat_id: chatId,
                  message_id: message.message_id
                }).catch(() => {});
              }
            }
          } catch (err) {
            console.error('[Bcrypt Compare Error]:', err.message);
          }
        }

        if (loginSuccess) {
          this.authenticatedUsers.set(chatId, user);
          this.pendingAuth.delete(chatId);
          session.state = 'IDLE';
          session.data = {};

          const userRolId = Number(user.id_rol);
          if (userRolId === 1 || userRolId === 4) {
            this.registerSubscriber(chatId);
          }

          const rolTexto = userRolId === 1 ? '👑 Administrador' : userRolId === 2 ? '🌾 Campesino / Vendedor' : userRolId === 4 ? '👨‍🌾 Asesor de Soporte' : '🛒 Comprador';
          
          await this.sendMessage(chatId, `🎉 <b>¡Identidad Verificada con Éxito!</b>\n━━━━━━━━━━━━━━━━━━\nBienvenido(a), <b>${user.nombre || user.username}</b>.\nTu cuenta ha sido vinculada como <b>${rolTexto}</b>.`);
          
          const menuMsg = this.generarMenuRol(user, chatId);
          await this.sendMessage(chatId, menuMsg);
          return { ok: true };
        } else {
          await this.sendMessage(
            chatId,
            `❌ <b>Datos incorrectos</b>\n━━━━━━━━━━━━━━━━━━\nPuedes ingresar de dos formas:\n1️⃣ Escribe tu <b>contraseña</b> de la plataforma web.\n2️⃣ O escribe el código de 6 dígitos de tu correo (o pulsa /reenviar).\n\n<i>(Escribe /cancelar para salir)</i>`
          );
          return { ok: true };
        }
      }

      // ── COMANDOS DE ROL: ADMINISTRADOR / ASESOR ──
      if (text.startsWith('/responder')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Este comando requiere permisos de <b>Administrador</b> o <b>Asesor</b>. Escribe /login con tu cuenta de administrador.');
          return { ok: true };
        }
        const parts = text.split(' ');
        if (parts.length < 3) {
          await this.sendMessage(chatId, '📝 <b>Uso correcto:</b> <code>/responder [CÓDIGO_TICKET] [MENSAJE]</code>\nEjemplo: <code>/responder TK-A1B2C3 Hola, con gusto te colaboramos...</code>');
          return { ok: true };
        }
        const ticketCode = parts[1];
        const replyText = parts.slice(2).join(' ');
        await this.responderTicket(chatId, ticketCode, replyText, authUser);
        return { ok: true };
      }

      if (text.startsWith('/cerrarticket')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        const parts = text.split(' ');
        const ticketCode = parts[1];
        if (!ticketCode) {
          await this.sendMessage(chatId, '📝 <b>Uso correcto:</b> <code>/cerrarticket [CÓDIGO_TICKET]</code>');
          return { ok: true };
        }
        if (this.soporteRepository) {
          const t = await this.soporteRepository.buscarTicketPorCodigo(ticketCode.toUpperCase());
          if (t) {
            await this.soporteRepository.actualizarTicket(t.id, { estado: 'cerrado' });
            if (this.socketHandler) {
              this.socketHandler.emitirTicketCerrado(t.session_id, t.id);
            }
            await this.sendMessage(chatId, `✅ Ticket <code>#${ticketCode}</code> cerrado correctamente.`);
          } else {
            await this.sendMessage(chatId, `❌ No se encontró el ticket <code>#${ticketCode}</code>.`);
          }
        }
        return { ok: true };
      }

      if (text === '/admin' || text === '/resumen' || text === '/metricas') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador. Escribe <code>/login</code>.');
          return { ok: true };
        }
        await this.mostrarResumenAdmin(chatId);
        return { ok: true };
      }

      if (text === '/tickets') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarTicketsPendientes(chatId);
        return { ok: true };
      }

      if (text === '/ventas') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarUltimasVentas(chatId);
        return { ok: true };
      }

      if (text === '/stock') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarStockCritico(chatId);
        return { ok: true };
      }

      // ── COMANDOS DE ROL: CAMPESINO / VENDEDOR ──
      if (text === '/misproductos') {
        await this.mostrarProductosCampesino(chatId, authUser);
        return { ok: true };
      }

      if (text === '/misventas') {
        await this.mostrarVentasCampesino(chatId, authUser);
        return { ok: true };
      }

      // ── COMANDOS DE ROL: COMPRADOR / CLIENTE ──
      if (text === '/mispedidos') {
        if (!authUser) {
          await this.sendMessage(chatId, '🔒 Para consultar tus pedidos personales, primero inicia sesión escribiendo <code>/login</code>.');
          return { ok: true };
        }
        await this.mostrarPedidosComprador(chatId, authUser);
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
              id_usuario: authUser ? authUser.id_usuario : null,
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
              id_usuario: authUser ? authUser.id_usuario : null,
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
              id_usuario: authUser ? authUser.id_usuario : null,
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
            id_usuario: authUser ? authUser.id_usuario : null,
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
              id_usuario: authUser ? authUser.id_usuario : null,
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
        if (authUser) {
          // Autocompletar datos del usuario autenticado
          session.data = {
            nombre: authUser.nombre || authUser.username,
            correo: authUser.correo,
            telefono: authUser.telefono || 'Sin registrar'
          };
          session.state = 'FORM_CATEGORIA';
          const catMenu = `
👋 <b>Centro de Soporte - De los Montes de María</b> 🌾
━━━━━━━━━━━━━━━━━━
Sesión activa: <b>${authUser.nombre || authUser.username}</b> (<code>${authUser.correo}</code>)

🏷️ Selecciona la <b>Categoría</b> de tu consulta (escribe del <b>1 al 5</b>):

1️⃣ 📦 Estado de Pedidos y Envíos
2️⃣ 🌱 Productos y Cosechas
3️⃣ 💳 Pagos y Facturación
4️⃣ 🌾 Registro de Campesino / Vendedor
5️⃣ ❓ Otra Consulta
`;
          await this.sendMessage(chatId, catMenu);
          return { ok: true };
        }

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
      if (text.startsWith('/start') || text === '/menu' || text === '/ayuda_comandos') {
        const menu = this.generarMenuRol(authUser, chatId);
        await this.sendMessage(chatId, menu);
      } else if (text.startsWith('/id')) {
        await this.sendMessage(chatId, `Tu Chat ID de Telegram es: <code>${chatId}</code>`);
      } else if (text.startsWith('/tienda') || text.startsWith('/catalogo')) {
        await this.sendMessage(chatId, `🛒 Explora cosechas frescas y productos del campo en nuestra web oficial:\n👉 https://delosmontesdemaria.onrender.com/catalogo`);
      } else if (text.startsWith('/pedidos')) {
        await this.sendMessage(chatId, `📦 Realizamos envíos directos desde los Montes de María hasta tu hogar con frescura garantizada.`);
      } else {
        const fallback = authUser
          ? `¡Hola ${authUser.nombre || userName}! Recibimos tu mensaje.\n\nEscribe <b>/menu</b> para ver tus opciones o <b>/soporte</b> para crear una consulta.`
          : `¡Hola ${userName}! Recibimos tu mensaje.\n\nEscribe <b>/soporte</b> para iniciar una consulta o <b>/login</b> para conectar tu cuenta.`;
        await this.sendMessage(chatId, fallback);
      }

      return { ok: true };
    } catch (err) {
      console.error('[Telegram Webhook Error]:', err);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Métodos auxiliares de autenticación y vistas por rol
   */
  async iniciarLoginConEmail(chatId, email, session) {
    if (!this.usuarioRepository) {
      await this.sendMessage(chatId, '❌ El servicio de usuarios no está disponible en este momento.');
      return;
    }

    try {
      const emailClean = email.trim().toLowerCase();
      const user = await this.usuarioRepository.buscarPorCorreo(emailClean);

      if (!user) {
        await this.sendMessage(
          chatId,
          `❌ No encontramos ninguna cuenta registrada con el correo <b>${emailClean}</b>.\n\nPor favor verifica tu correo o regístrate en nuestra plataforma web:\n👉 https://delosmontesdemaria.onrender.com/registro`
        );
        session.state = 'IDLE';
        return;
      }

      session.state = 'LOGIN_WAIT_AUTH';
      session.data = { authUser: user };

      // Generar código OTP preventivo
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      this.pendingAuth.set(chatId, {
        code: otpCode,
        userObj: user,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutos
      });

      // Disparar envío de correo con código de verificación en segundo plano
      if (this.emailService && typeof this.emailService.enviarCodigoVerificacionTelegram === 'function') {
        this.emailService.enviarCodigoVerificacionTelegram({
          correo: user.correo,
          nombre: user.nombre || user.username,
          codigo: otpCode
        }).catch((err) => console.error('[Telegram OTP Email Error]:', err));
      }

      const loginPrompt = `
🔐 <b>INICIAR SESIÓN - 2 OPCIONES DISPONIBLES</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> ${user.nombre || user.username}
📧 <b>Correo:</b> <code>${user.correo}</code>

Puedes ingresar de cualquiera de estas dos formas:

1️⃣ <b>Opción 1: Contraseña de la web (Instantáneo)</b>
👉 Escribe tu <b>contraseña de la página web</b> directamente en este chat. <i>(El mensaje se borrará al instante por seguridad)</i>.

2️⃣ <b>Opción 2: Código por Correo</b>
👉 O escribe el código de 6 dígitos que enviamos a tu correo (puedes pulsar el botón de abajo o escribir <b>/reenviar</b>).

<i>(Escribe /cancelar para salir)</i>
`;

      const resendKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Reenviar código a mi correo', callback_data: 'resend_otp' }
            ]
          ]
        }
      };

      await this.sendMessage(chatId, loginPrompt, resendKeyboard);
    } catch (err) {
      console.error('[Telegram Login Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al procesar tu solicitud: ${err.message}`);
    }
  }

  /**
   * Reenviar código OTP por correo
   */
  async reenviarCodigoOTP(chatId) {
    const pending = this.pendingAuth.get(chatId);

    if (!pending || !pending.userObj) {
      await this.sendMessage(chatId, '⚠️ No tienes una solicitud activa de inicio de sesión. Escribe <b>/login</b> para comenzar.');
      return;
    }

    const user = pending.userObj;
    const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

    this.pendingAuth.set(chatId, {
      code: newOtpCode,
      userObj: user,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutos
    });

    if (this.emailService && typeof this.emailService.enviarCodigoVerificacionTelegram === 'function') {
      this.emailService.enviarCodigoVerificacionTelegram({
        correo: user.correo,
        nombre: user.nombre || user.username,
        codigo: newOtpCode
      }).catch((err) => console.error('[Telegram Resend OTP Error]:', err));
    }

    const resendMsg = `
🔄 <b>¡NUEVO CÓDIGO GENERADO Y ENVIADO!</b>
━━━━━━━━━━━━━━━━━━
Hemos enviado un nuevo código de 6 dígitos a tu correo:
📧 <b>${user.correo}</b>

✍️ <b>Revisa tu bandeja de entrada (o spam) en Gmail y escribe los 6 dígitos aquí:</b>

━━━━━━━━━━━━━━━━━━
<i>¿Aún no te llega? Puedes volver a pulsar el botón de abajo o escribir /reenviar.</i>
`;

    const resendKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Reenviar código nuevamente', callback_data: 'resend_otp' }
          ]
        ]
      }
    };

    await this.sendMessage(chatId, resendMsg, resendKeyboard);
  }

  async mostrarResumenAdmin(chatId) {
    try {
      let totalVentas = 0;
      let montoTotal = 0;
      let stockCriticoCount = 0;
      let ticketsAbiertos = 0;

      if (this.compraRepository) {
        try {
          const compras = await this.compraRepository.listarTodas();
          if (Array.isArray(compras)) {
            totalVentas = compras.length;
            montoTotal = compras.reduce((acc, c) => acc + Number(c.total || 0), 0);
          }
        } catch (_) {}
      }

      if (this.productoRepository) {
        try {
          const prods = await this.productoRepository.buscarTodos();
          if (Array.isArray(prods)) {
            stockCriticoCount = prods.filter((p) => Number(p.stock || 0) <= 5).length;
          }
        } catch (_) {}
      }

      if (this.soporteRepository) {
        try {
          const tickets = await this.soporteRepository.listarTickets();
          if (Array.isArray(tickets)) {
            ticketsAbiertos = tickets.filter((t) => t.estado !== 'cerrado').length;
          }
        } catch (_) {}
      }

      const msg = `
📊 <b>RESUMEN GENERAL DEL SISTEMA</b> 🌾
━━━━━━━━━━━━━━━━━━
💰 <b>Ventas Totales:</b> <code>${totalVentas} pedidos</code> ($${montoTotal.toLocaleString('es-CO')} COP)
🎫 <b>Tickets Abiertos:</b> <code>${ticketsAbiertos}</code> en atención
⚠️ <b>Productos con Stock Bajo (≤5):</b> <code>${stockCriticoCount}</code>

<b>Accesos Rápidos:</b>
👉 <code>/tickets</code> - Ver y atender consultas
👉 <code>/ventas</code> - Ver últimos pedidos
👉 <code>/stock</code> - Ver inventario crítico
👉 Panel Web: https://delosmontesdemaria.onrender.com/admin
`;
      await this.sendMessage(chatId, msg);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al cargar resumen: ${err.message}`);
    }
  }

  async mostrarTicketsPendientes(chatId) {
    if (!this.soporteRepository) return;
    try {
      const tickets = await this.soporteRepository.listarTickets();
      const pendientes = (tickets || []).filter((t) => t.estado !== 'cerrado').slice(0, 8);

      if (pendientes.length === 0) {
        await this.sendMessage(chatId, '🎉 <b>¡Excelente!</b> No hay tickets de soporte pendientes en este momento.');
        return;
      }

      let lista = '🎫 <b>TICKETS DE SOPORTE PENDIENTES:</b>\n━━━━━━━━━━━━━━━━━━\n';
      pendientes.forEach((t, idx) => {
        const code = t.ticket_code || t.id;
        const estadoTag = t.estado === 'agente' ? '👨‍🌾 En Atención' : '🤖 IA / Bot';
        lista += `\n<b>${idx + 1}.</b> <code>#${code}</code> | ${estadoTag}\n   👤 <b>${t.nombre_cliente}</b>\n   📝 <i>${t.asunto}</i>\n`;
      });

      lista += '\n━━━━━━━━━━━━━━━━━━\n👉 <b>Para responder a un cliente escribe:</b>\n<code>/responder [CÓDIGO] [Tu respuesta]</code>\n<i>Ejemplo: <code>/responder TK-123456 Hola, tu pedido ya salió</code></i>';
      await this.sendMessage(chatId, lista);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al listar tickets: ${err.message}`);
    }
  }

  async mostrarUltimasVentas(chatId) {
    if (!this.compraRepository) return;
    try {
      const compras = await this.compraRepository.listarTodas();
      const ultimas = (compras || []).slice(0, 5);

      if (ultimas.length === 0) {
        await this.sendMessage(chatId, '📦 Aún no hay compras registradas en el sistema.');
        return;
      }

      let lista = '🛒 <b>ÚLTIMAS VENTAS REGISTRADAS:</b>\n━━━━━━━━━━━━━━━━━━\n';
      ultimas.forEach((c) => {
        const id = c.id_compra || c.id;
        const total = Number(c.total || 0).toLocaleString('es-CO');
        const estado = (c.estado || 'Recibido').toUpperCase();
        lista += `\n🧾 <b>#ORD-${id}</b> | <b>$${total} COP</b>\n   🚚 Estado: <code>${estado}</code>\n   💳 Pago: ${c.metodo_pago || 'Contra Entrega'}\n`;
      });

      await this.sendMessage(chatId, lista);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al listar ventas: ${err.message}`);
    }
  }

  async mostrarStockCritico(chatId) {
    if (!this.productoRepository) return;
    try {
      const productos = await this.productoRepository.buscarTodos();
      const criticos = (productos || []).filter((p) => Number(p.stock || 0) <= 5);

      if (criticos.length === 0) {
        await this.sendMessage(chatId, '✅ <b>¡Todo el inventario está en niveles óptimos!</b> No hay cosechas con menos de 5 unidades.');
        return;
      }

      let lista = '⚠️ <b>COSECHAS CON STOCK BAJO (≤5 unidades):</b>\n━━━━━━━━━━━━━━━━━━\n';
      criticos.forEach((p) => {
        lista += `\n📦 <b>${p.nombre}</b>\n   🌾 Stock: <b>${p.stock} unidades</b> (Precio: $${Number(p.precio || 0).toLocaleString('es-CO')})\n`;
      });
      lista += '\n👉 <a href="https://delosmontesdemaria.onrender.com/admin">Actualizar en el Panel Web</a>';

      await this.sendMessage(chatId, lista);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al consultar stock: ${err.message}`);
    }
  }

  async mostrarProductosCampesino(chatId, authUser) {
    if (!this.productoRepository) return;
    try {
      const productos = await this.productoRepository.buscarTodos();
      let misProds = productos || [];
      if (authUser && authUser.id_rol === 2) {
        misProds = misProds.filter((p) => p.id_vendedor === authUser.id_usuario);
      }

      if (misProds.length === 0) {
        await this.sendMessage(chatId, '🌾 No se encontraron productos registrados para tu cuenta de productor.');
        return;
      }

      let lista = `🌾 <b>COSECHAS Y PRODUCTOS PUBLICADOS (${misProds.length}):</b>\n━━━━━━━━━━━━━━━━━━\n`;
      misProds.slice(0, 8).forEach((p) => {
        lista += `\n🌱 <b>${p.nombre}</b>\n   📦 Stock: <code>${p.stock} unidades</code> | 💵 <b>$${Number(p.precio || 0).toLocaleString('es-CO')} COP</b>\n`;
      });

      await this.sendMessage(chatId, lista);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al consultar productos: ${err.message}`);
    }
  }

  async mostrarVentasCampesino(chatId, authUser) {
    await this.sendMessage(chatId, `🌾 <b>Mis Ventas como Productor</b>\nPuedes consultar el balance y liquidaciones detalladas en tu panel web:\n👉 https://delosmontesdemaria.onrender.com/perfil`);
  }

  async mostrarPedidosComprador(chatId, authUser) {
    if (!this.compraRepository || !authUser) return;
    try {
      const pedidos = await this.compraRepository.listarPorUsuario(authUser.id_usuario);
      const misPedidos = (pedidos || []).slice(0, 5);

      if (misPedidos.length === 0) {
        await this.sendMessage(chatId, '🛒 No tienes compras registradas aún.\n\n🌾 ¡Explora nuestras cosechas frescas en https://delosmontesdemaria.onrender.com/catalogo!');
        return;
      }

      let lista = `📦 <b>TUS ÚLTIMOS PEDIDOS (#${misPedidos.length}):</b>\n━━━━━━━━━━━━━━━━━━\n`;
      misPedidos.forEach((p) => {
        const id = p.id_compra || p.id;
        const total = Number(p.total || 0).toLocaleString('es-CO');
        const estado = (p.estado || 'En preparación').toUpperCase();
        lista += `\n🧾 <b>Pedido #ORD-${id}</b>\n   🚚 Estado: <b>${estado}</b>\n   💰 Total: $${total} COP\n`;
      });

      lista += '\n💡 <i>Te avisaremos por aquí automáticamente cuando tu pedido cambie de estado.</i>';
      await this.sendMessage(chatId, lista);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al consultar tus pedidos: ${err.message}`);
    }
  }
}

module.exports = TelegramService;
