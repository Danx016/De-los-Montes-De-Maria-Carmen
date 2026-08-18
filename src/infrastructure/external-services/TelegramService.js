/**
 * Servicio Externo: TelegramService
 * Integración con la API oficial de Telegram Bot (montesdemariabot)
 * - Sistema interactivo de Tickets de Soporte por pasos con Botones Táctiles
 * - Conexión directa con la IA de Soporte (IAService / OpenRouter)
 * - Transferencia fluida a Asesores Humanos y respuestas interactivas 1-click
 * - Alertas en tiempo real a administradores con botones de acción directa
 * - Menú táctil persistente según el rol del usuario (Admin, Campesino, Comprador)
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

    // Memoria de sesiones conversacionales por chatId
    // { state: 'IDLE' | 'FORM_NOMBRE' | 'FORM_CORREO' | 'FORM_TELEFONO' | 'FORM_CATEGORIA' | 'FORM_MENSAJE' | 'CHAT_ACTIVO' | 'LOGIN_WAIT_EMAIL' | 'LOGIN_WAIT_AUTH' | 'WAITING_TICKET_REPLY', data: {}, activeTicket: null, replyTicketCode: null }
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
   * Genera el teclado persistente en la parte inferior según el rol
   */
  getPersistentKeyboard(authUser) {
    if (!authUser) {
      return {
        keyboard: [
          [{ text: '🔐 Iniciar Sesión' }, { text: '💬 Soporte' }],
          [{ text: '🛒 Ver Catálogo' }, { text: '🆔 Mi ID' }]
        ],
        resize_keyboard: true,
        persistent: true
      };
    }

    const rolId = Number(authUser.id_rol);
    if (rolId === 1 || rolId === 4) {
      // Admin o Asesor
      return {
        keyboard: [
          [{ text: '📊 Resumen' }, { text: '🎫 Tickets' }],
          [{ text: '🛒 Ventas' }, { text: '⚠️ Stock' }],
          [{ text: '🌾 Catálogo' }, { text: '👤 Mi Perfil' }]
        ],
        resize_keyboard: true,
        persistent: true
      };
    } else if (rolId === 2) {
      // Campesino / Vendedor
      return {
        keyboard: [
          [{ text: '🌾 Mis Productos' }, { text: '💰 Mis Ventas' }],
          [{ text: '🛒 Catálogo' }, { text: '💬 Soporte' }],
          [{ text: '👤 Mi Perfil' }]
        ],
        resize_keyboard: true,
        persistent: true
      };
    } else {
      // Comprador / Cliente
      return {
        keyboard: [
          [{ text: '📦 Mis Pedidos' }, { text: '🛒 Catálogo' }],
          [{ text: '💬 Soporte' }, { text: '👤 Mi Perfil' }]
        ],
        resize_keyboard: true,
        persistent: true
      };
    }
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
   * Enviar mensaje a todos los administradores / suscriptores registrados (con exclusión opcional del emisor)
   */
  async broadcastAdmins(text, options = {}, excludeChatId = null) {
    const recipients = Array.from(this.subscribers).filter((id) => !excludeChatId || String(id) !== String(excludeChatId));
    if (recipients.length === 0) {
      return;
    }
    const promises = recipients.map((id) => this.sendMessage(id, text, options));
    return await Promise.allSettled(promises);
  }

  /**
   * Registrar nuevo chat_id dinámicamente
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
📍 <b>Entrega:</b> ${direccion || 'Montes de María, Colombia'}
💳 <b>Pago:</b> ${metodoPago || 'Contra Entrega'}
💰 <b>Total:</b> <b>$${formattedTotal} COP</b>

🌾 <b>Detalle de Cosechas:</b>
${productsList}
━━━━━━━━━━━━━━━━━━
🌿 <i>De los Montes de María - Cosechando Futuro</i>
`;
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🛒 Ver Pedidos', callback_data: 'cmd_ventas' },
              { text: '🌐 Panel Web', url: 'https://delosmontesdemaria.onrender.com/admin' }
            ]
          ]
        }
      };

      await this.broadcastAdmins(msg, keyboard);
    } catch (err) {
      console.error('[Telegram] Error al notificar compra:', err);
    }
  }

  /**
   * Alerta de Stock Bajo
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
`;
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚠️ Ver Todo el Stock Bajo', callback_data: 'cmd_stock' },
              { text: '🌐 Actualizar en Web', url: 'https://delosmontesdemaria.onrender.com/admin' }
            ]
          ]
        }
      };

      await this.broadcastAdmins(msg, keyboard);
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
  async notificarNuevoTicket({ ticket, mensajeInicial, excludeChatId = null }) {
    try {
      const ticketCode = ticket.ticket_code || ticket.session_id;
      const msg = `
🎫 <b>NUEVA CONSULTA DE SOPORTE</b>
━━━━━━━━━━━━━━━━━━
Código: <code>#${ticketCode}</code>
Cliente: <b>${ticket.nombre_cliente || 'Usuario'}</b>
Correo: <code>${ticket.correo_cliente || 'N/A'}</code>
Asunto: <b>${ticket.asunto || 'Consulta'}</b>

📝 <b>Mensaje:</b>
<i>"${mensajeInicial || 'Solicitud de información'}"</i>
━━━━━━━━━━━━━━━━━━
`;
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `💬 Responder a #${ticketCode}`, callback_data: `reply_tk:${ticketCode}` },
              { text: `🔒 Cerrar Ticket`, callback_data: `close_tk:${ticketCode}` }
            ]
          ]
        }
      };

      await this.broadcastAdmins(msg, keyboard, excludeChatId);
    } catch (err) {
      console.error('[Telegram] Error al notificar ticket:', err);
    }
  }

  /**
   * Notificar cuando un cliente solicita hablar con Asesor Humano
   */
  async notificarSolicitudAsesorHumano({ ticket, excludeChatId = null }) {
    try {
      const ticketCode = ticket.ticket_code || ticket.id;
      const msg = `
🚨 <b>¡CLIENTE SOLICITA ASESOR HUMANO!</b>
━━━━━━━━━━━━━━━━━━
Ticket: <code>#${ticketCode}</code>
Cliente: <b>${ticket.nombre_cliente}</b>
Teléfono: <code>${ticket.telefono_cliente || 'N/A'}</code>
Asunto: <b>${ticket.asunto}</b>
━━━━━━━━━━━━━━━━━━
⚡ <i>Toca el botón de abajo para atender directamente desde Telegram:</i>
`;
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `💬 Atender #${ticketCode} Ahora`, callback_data: `reply_tk:${ticketCode}` },
              { text: `🌐 Abrir en Panel`, url: 'https://delosmontesdemaria.onrender.com/admin/soporte' }
            ]
          ]
        }
      };

      await this.broadcastAdmins(msg, keyboard, excludeChatId);
    } catch (err) {
      console.error('[Telegram] Error al notificar asesor humano:', err);
    }
  }

  /**
   * Generar menú interactivo según el rol del usuario autenticado
   */
  generarMenuRol(authUser, chatId) {
    if (!authUser) {
      return {
        text: `
👋 <b>¡Bienvenido al Bot de De los Montes de María!</b> 🌾
━━━━━━━━━━━━━━━━━━
Tu <b>Chat ID:</b> <code>${chatId}</code>
Estado: 👤 <i>Usuario Invitado</i>

🔐 <b>Conecta tu cuenta para acceder a tus pedidos o panel:</b>
Toca el botón <b>🔐 Iniciar Sesión</b> abajo o escribe <code>/login</code>.

<b>Opciones Rápidas:</b>
💬 <b>Soporte con IA</b> - Escribe <code>/soporte</code>
🛒 <b>Catálogo Campesino</b> - Escribe <code>/tienda</code>
📦 <b>Envíos</b> - Escribe <code>/pedidos</code>
`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔐 Iniciar Sesión', callback_data: 'cmd_login' },
              { text: '💬 Soporte & Ayuda', callback_data: 'cmd_soporte' }
            ],
            [
              { text: '🛒 Ver Catálogo Web', url: 'https://delosmontesdemaria.onrender.com/catalogo' }
            ]
          ]
        }
      };
    }

    const rolId = Number(authUser.id_rol);
    const nombre = authUser.nombre || authUser.username || 'Usuario';

    // 1. Administrador (id_rol = 1) o Asesor (id_rol = 4)
    if (rolId === 1 || rolId === 4) {
      const badge = rolId === 1 ? '👑 ADMINISTRADOR' : '👨‍🌾 ASESOR DE SOPORTE';
      return {
        text: `
🌾 <b>PANEL DE CONTROL TELEGRAM</b> 🌾
━━━━━━━━━━━━━━━━━━
👤 <b>Sesión:</b> ${nombre} (${badge})
📧 <b>Correo:</b> <code>${authUser.correo}</code>
━━━━━━━━━━━━━━━━━━
<b>Selecciona una acción rápida en los botones:</b>
`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Resumen General', callback_data: 'cmd_resumen' },
              { text: '🎫 Ver Tickets', callback_data: 'cmd_tickets' }
            ],
            [
              { text: '🛒 Últimas Ventas', callback_data: 'cmd_ventas' },
              { text: '⚠️ Stock Crítico', callback_data: 'cmd_stock' }
            ],
            [
              { text: '👤 Mi Perfil', callback_data: 'cmd_perfil' },
              { text: '🚪 Cerrar Sesión', callback_data: 'cmd_logout' }
            ],
            [
              { text: '🌐 Panel Web Administrativo', url: 'https://delosmontesdemaria.onrender.com/admin' }
            ]
          ]
        }
      };
    }

    // 2. Campesino / Vendedor (id_rol = 2)
    if (rolId === 2) {
      return {
        text: `
🌱 <b>PANEL DE PRODUCTOR CAMPESINO</b> 🌱
━━━━━━━━━━━━━━━━━━
👨‍🌾 <b>Productor:</b> ${nombre}
📧 <b>Correo:</b> <code>${authUser.correo}</code>
━━━━━━━━━━━━━━━━━━
<b>Tus Herramientas Rápidas:</b>
`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌾 Mis Cosechas & Stock', callback_data: 'cmd_misproductos' },
              { text: '💰 Mis Ventas', callback_data: 'cmd_misventas' }
            ],
            [
              { text: '💬 Soporte Directo', callback_data: 'cmd_soporte' },
              { text: '👤 Mi Perfil', callback_data: 'cmd_perfil' }
            ],
            [
              { text: '🚪 Cerrar Sesión', callback_data: 'cmd_logout' }
            ]
          ]
        }
      };
    }

    // 3. Comprador / Cliente (id_rol = 3)
    return {
      text: `
🛒 <b>PANEL DEL COMPRADOR</b> 🛒
━━━━━━━━━━━━━━━━━━
👤 <b>Hola:</b> ${nombre}
📧 <b>Correo:</b> <code>${authUser.correo}</code>
━━━━━━━━━━━━━━━━━━
<b>Tus Opciones:</b>
`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📦 Mis Pedidos & Estado', callback_data: 'cmd_mispedidos' },
            { text: '💬 Crear Consulta Soporte', callback_data: 'cmd_soporte' }
          ],
          [
            { text: '🛒 Ver Catálogo Web', url: 'https://delosmontesdemaria.onrender.com/catalogo' },
            { text: '👤 Mi Perfil', callback_data: 'cmd_perfil' }
          ],
          [
            { text: '🚪 Cerrar Sesión', callback_data: 'cmd_logout' }
          ]
        ]
      }
    };
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
      const cleanCode = ticketCode.toUpperCase().replace('#', '').trim();
      const ticket = await this.soporteRepository.buscarTicketPorCodigo(cleanCode);

      if (!ticket) {
        await this.sendMessage(chatId, `❌ No se encontró ningún ticket con el código <code>${cleanCode}</code>.`);
        return;
      }

      const nombreAsesor = authUser?.nombre || authUser?.username || 'Equipo de Soporte';
      const idUsuario = authUser?.id_usuario || null;

      // 1. Guardar mensaje en DB
      await this.soporteRepository.agregarMensaje({
        ticket_id: ticket.id,
        session_id: ticket.session_id,
        id_usuario: idUsuario,
        nombre_remitente: nombreAsesor,
        rol: 'agente',
        mensaje: replyText,
        leido: 0
      });

      // 2. Actualizar estado
      await this.soporteRepository.actualizarTicket(ticket.id, {
        estado: 'agente',
        nombre_agente: nombreAsesor,
        id_agente: idUsuario
      });

      // 3. Emitir a Socket.IO
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

      // 5. Confirmar con botón de cierre
      const confirmKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `💬 Responder de nuevo`, callback_data: `reply_tk:${cleanCode}` },
              { text: `🔒 Cerrar Ticket #${cleanCode}`, callback_data: `close_tk:${cleanCode}` }
            ]
          ]
        }
      };

      await this.sendMessage(
        chatId,
        `✅ <b>Respuesta enviada con éxito al cliente</b>\n━━━━━━━━━━━━━━━━━━\n🎫 <b>Ticket:</b> <code>#${cleanCode}</code>\n👤 <b>Cliente:</b> ${ticket.nombre_cliente}\n📝 <b>Mensaje:</b> <i>"${replyText}"</i>`,
        confirmKeyboard
      );
    } catch (err) {
      console.error('[Telegram responderTicket Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al enviar respuesta: ${err.message}`);
    }
  }

  /**
   * PROCESADOR PRINCIPAL DE ACTUALIZACIONES (WEBHOOK)
   */
  async procesarUpdate(update) {
    try {
      if (!update) return { ok: true };

      // ── MANEJO DE BOTONES INTERACTIVOS (CALLBACK QUERIES) ──
      if (update.callback_query) {
        const cb = update.callback_query;
        const cbChatId = String(cb.message?.chat?.id || cb.from?.id);
        const cbData = cb.data || '';

        // Feedback táctil inmediato
        if (cb.id) {
          this.request('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
        }

        let session = this.sessions.get(cbChatId);
        if (!session) {
          session = { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null };
          this.sessions.set(cbChatId, session);
        }

        const authUser = this.authenticatedUsers.get(cbChatId) || null;
        const rolId = authUser ? Number(authUser.id_rol) : null;
        const isAdminOrAdvisor = rolId === 1 || rolId === 4;

        if (cbData === 'resend_otp') {
          await this.reenviarCodigoOTP(cbChatId);
          return { ok: true };
        }

        if (cbData === 'cmd_login') {
          session.state = 'LOGIN_WAIT_EMAIL';
          await this.sendMessage(cbChatId, '📧 Por favor escribe tu <b>Correo Electrónico o Usuario</b>:\n<i>(O escribe /cancelar para salir)</i>');
          return { ok: true };
        }

        if (cbData === 'cmd_logout') {
          this.authenticatedUsers.delete(cbChatId);
          this.pendingAuth.delete(cbChatId);
          this.sessions.set(cbChatId, { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null });
          const kb = this.getPersistentKeyboard(null);
          await this.sendMessage(cbChatId, '👋 <b>Sesión cerrada exitosamente.</b>\nHas vuelto al modo invitado.', { reply_markup: kb });
          return { ok: true };
        }

        if (cbData === 'cmd_resumen') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarResumenAdmin(cbChatId);
          }
          return { ok: true };
        }

        if (cbData === 'cmd_tickets') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarTicketsPendientes(cbChatId);
          }
          return { ok: true };
        }

        if (cbData === 'cmd_ventas') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarUltimasVentas(cbChatId);
          }
          return { ok: true };
        }

        if (cbData === 'cmd_stock') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarStockCritico(cbChatId);
          }
          return { ok: true };
        }

        if (cbData === 'cmd_misproductos') {
          await this.mostrarProductosCampesino(cbChatId, authUser);
          return { ok: true };
        }

        if (cbData === 'cmd_misventas') {
          await this.mostrarVentasCampesino(cbChatId, authUser);
          return { ok: true };
        }

        if (cbData === 'cmd_mispedidos') {
          await this.mostrarPedidosComprador(cbChatId, authUser);
          return { ok: true };
        }

        if (cbData === 'cmd_perfil') {
          await this.mostrarPerfilUsuario(cbChatId, authUser);
          return { ok: true };
        }

        if (cbData === 'cmd_soporte') {
          await this.iniciarFlujoSoporte(cbChatId, authUser, session);
          return { ok: true };
        }

        // Selección de categoría en soporte vía botón
        if (cbData.startsWith('cat_')) {
          const catMap = {
            'cat_pedidos': '📦 Estado de Pedidos & Envíos',
            'cat_productos': '🌱 Productos & Cosechas',
            'cat_pagos': '💳 Pagos & Facturación',
            'cat_campesino': '🌾 Registro de Campesino',
            'cat_general': '❓ Consulta General'
          };
          const selectedCat = catMap[cbData] || 'Consulta General';
          session.data.categoria = selectedCat;
          session.state = 'FORM_MENSAJE';
          await this.sendMessage(cbChatId, `✅ Categoría: <b>${selectedCat}</b>\n\n✍️ Ahora escribe tu <b>Consulta o Problema</b> en detalle:`);
          return { ok: true };
        }

        // 1-Click Responder a Ticket
        if (cbData.startsWith('reply_tk:')) {
          const ticketCode = cbData.replace('reply_tk:', '').trim();
          session.state = 'WAITING_TICKET_REPLY';
          session.replyTicketCode = ticketCode;
          await this.sendMessage(
            cbChatId,
            `✍️ <b>Modo Respuesta Activado para Ticket #${ticketCode}</b>\n━━━━━━━━━━━━━━━━━━\nEscribe a continuación el mensaje que deseas enviar al cliente:\n<i>(O escribe /cancelar para salir)</i>`
          );
          return { ok: true };
        }

        // 1-Click Cerrar Ticket
        if (cbData.startsWith('close_tk:')) {
          const ticketCode = cbData.replace('close_tk:', '').trim();
          if (this.soporteRepository) {
            const t = await this.soporteRepository.buscarTicketPorCodigo(ticketCode);
            if (t) {
              await this.soporteRepository.actualizarTicket(t.id, { estado: 'cerrado' });
              if (this.socketHandler) {
                this.socketHandler.emitirTicketCerrado(t.session_id, t.id);
              }
              await this.sendMessage(cbChatId, `✅ Ticket <code>#${ticketCode}</code> cerrado correctamente.`);
            } else {
              await this.sendMessage(cbChatId, `❌ No se encontró el ticket <code>#${ticketCode}</code>.`);
            }
          }
          return { ok: true };
        }

        // Solicitar asesor desde botón de respuesta IA
        if (cbData === 'escalate_agent') {
          if (session.state === 'CHAT_ACTIVO' && session.activeTicket) {
            const ticket = session.activeTicket;
            if (this.soporteRepository) {
              await this.soporteRepository.actualizarTicket(ticket.id, { estado: 'agente' });
            }
            this.notificarSolicitudAsesorHumano({ ticket, excludeChatId: cbChatId }).catch(() => {});
            await this.sendMessage(cbChatId, `🔔 <b>¡Solicitud de Asesor Humano Recibida!</b>\n━━━━━━━━━━━━━━━━━━\nHemos notificado a nuestro equipo. Un asesor humano te atenderá por este chat en breve.`);
          }
          return { ok: true };
        }

        // Finalizar ticket desde botón
        if (cbData === 'close_my_ticket') {
          if (session.activeTicket && this.soporteRepository) {
            try {
              await this.soporteRepository.actualizarTicket(session.activeTicket.id, { estado: 'cerrado' });
              if (this.socketHandler) {
                this.socketHandler.emitirTicketCerrado(session.activeSessionId, session.activeTicket.id);
              }
            } catch (_) {}
          }
          session.state = 'IDLE';
          session.activeTicket = null;
          session.activeSessionId = null;
          await this.sendMessage(cbChatId, '✅ <b>Ticket finalizado exitosamente.</b>\n¡Gracias por preferir De los Montes de María! 🌾');
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

      // Registrar chat para alertas
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

      // ── MODO ESPERANDO RESPUESTA A TICKET (TRIGGERED BY INLINE BUTTON) ──
      if (session.state === 'WAITING_TICKET_REPLY' && session.replyTicketCode) {
        if (text === '/cancelar' || text === '/salir') {
          session.state = 'IDLE';
          session.replyTicketCode = null;
          await this.sendMessage(chatId, '❌ Respuesta cancelada.');
          return { ok: true };
        }
        const code = session.replyTicketCode;
        session.state = 'IDLE';
        session.replyTicketCode = null;
        await this.responderTicket(chatId, code, text, authUser);
        return { ok: true };
      }

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
        const kb = this.getPersistentKeyboard(authUser);
        await this.sendMessage(chatId, '🔄 Proceso cancelado.', { reply_markup: kb });
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
        const kb = this.getPersistentKeyboard(authUser);
        await this.sendMessage(chatId, '✅ <b>Ticket de soporte cerrado exitosamente.</b>\n\n¡Muchas gracias por contactar a <b>De los Montes de María</b>! 🌾', { reply_markup: kb });
        return { ok: true };
      }

      // ── GESTIÓN DE SESIÓN Y AUTENTICACIÓN (/LOGIN, /LOGOUT, /PERFIL) ──
      if (text === '/logout' || text === '/desconectar' || text === '/salir' || text === '🚪 Cerrar Sesión') {
        this.authenticatedUsers.delete(chatId);
        this.pendingAuth.delete(chatId);
        this.sessions.set(chatId, { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null });
        const kb = this.getPersistentKeyboard(null);
        await this.sendMessage(chatId, '👋 <b>Sesión cerrada exitosamente.</b>\nHas vuelto al modo invitado. Escribe /login cuando desees volver a identificarte.', { reply_markup: kb });
        return { ok: true };
      }

      if (text === '/perfil' || text === '/cuenta' || text === '👤 Mi Perfil') {
        await this.mostrarPerfilUsuario(chatId, authUser);
        return { ok: true };
      }

      // Iniciar proceso de Login
      if (text === '🔐 Iniciar Sesión' || text === '/login' || text === '/conectar') {
        session.state = 'LOGIN_WAIT_EMAIL';
        await this.sendMessage(chatId, '📧 Por favor escribe tu <b>Correo Electrónico o Usuario</b>:\n<i>(O escribe /cancelar para salir)</i>');
        return { ok: true };
      }

      if (text.startsWith('/login ') || text.startsWith('/conectar ')) {
        const userInput = text.replace(/^\/(login|conectar)\s+/, '').trim();
        if (userInput) {
          await this.iniciarLoginConIdentificador(chatId, userInput, session);
        } else {
          session.state = 'LOGIN_WAIT_EMAIL';
          await this.sendMessage(chatId, '📧 Por favor escribe tu <b>Correo Electrónico o Usuario</b>:\n<i>(O escribe /cancelar para salir)</i>');
        }
        return { ok: true };
      }

      if (session.state === 'LOGIN_WAIT_EMAIL') {
        await this.iniciarLoginConIdentificador(chatId, text.trim(), session);
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

        if (lower === '1' || lower === 'opcion 1' || lower === 'opción 1' || lower === '1️⃣') {
          await this.sendMessage(chatId, '🔑 Por favor escribe directamente tu <b>contraseña de la plataforma web</b>:\n<i>(Se borrará de inmediato del chat por tu seguridad)</i>');
          return { ok: true };
        }

        if (lower === '2' || lower === 'opcion 2' || lower === 'opción 2' || lower === '2️⃣') {
          await this.sendMessage(chatId, `📩 Por favor escribe el <b>código de 6 dígitos</b> que enviamos a <code>${user.correo}</code>:\n<i>(O pulsa "Reenviar código" abajo si no lo has recibido)</i>`);
          return { ok: true };
        }

        let loginSuccess = false;

        // 1. Código OTP de 6 dígitos
        const cleanDigits = text.replace(/\D/g, '').trim();
        if (pending && cleanDigits.length === 6 && cleanDigits === pending.code) {
          if (Date.now() <= pending.expiresAt) {
            loginSuccess = true;
          } else {
            await this.sendMessage(chatId, '⌛ El código de 6 dígitos ha vencido. Puedes ingresar con tu <b>contraseña de la web</b> o pulsar reenviar código.');
            return { ok: true };
          }
        }

        // 2. Contraseña del usuario (Bcrypt)
        if (!loginSuccess && user.contrasena) {
          try {
            const passwordMatch = await bcrypt.compare(text, user.contrasena);
            if (passwordMatch) {
              loginSuccess = true;
              // Eliminar el mensaje de la contraseña por seguridad
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
          
          const kb = this.getPersistentKeyboard(user);
          await this.sendMessage(
            chatId,
            `🎉 <b>¡Identidad Verificada con Éxito!</b>\n━━━━━━━━━━━━━━━━━━\nBienvenido(a), <b>${user.nombre || user.username}</b>.\nTu cuenta ha sido vinculada como <b>${rolTexto}</b>.`,
            { reply_markup: kb }
          );
          
          const menuData = this.generarMenuRol(user, chatId);
          await this.sendMessage(chatId, menuData.text, { reply_markup: menuData.reply_markup });
          return { ok: true };
        } else {
          const retryKeyboard = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 Reenviar código a mi correo', callback_data: 'resend_otp' },
                  { text: '❌ Cancelar', callback_data: 'cmd_logout' }
                ]
              ]
            }
          };

          await this.sendMessage(
            chatId,
            `❌ <b>Datos no válidos</b>\n━━━━━━━━━━━━━━━━━━\nEscribe directamente:\n🔑 Tu <b>contraseña de la web</b>\n— o —\n📩 El <b>código de 6 dígitos</b> que llegó a tu correo.\n\n<i>(Escribe /cancelar para salir)</i>`,
            retryKeyboard
          );
          return { ok: true };
        }
      }

      // ── COMANDOS DE ACCESO RÁPIDO ──
      if (text === '/admin' || text === '/resumen' || text === '/metricas' || text === '📊 Resumen') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador. Escribe <code>/login</code>.');
          return { ok: true };
        }
        await this.mostrarResumenAdmin(chatId);
        return { ok: true };
      }

      if (text === '/tickets' || text === '🎫 Tickets') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarTicketsPendientes(chatId);
        return { ok: true };
      }

      if (text === '/ventas' || text === '🛒 Ventas') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarUltimasVentas(chatId);
        return { ok: true };
      }

      if (text === '/stock' || text === '⚠️ Stock') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarStockCritico(chatId);
        return { ok: true };
      }

      if (text === '/misproductos' || text === '🌾 Mis Productos') {
        await this.mostrarProductosCampesino(chatId, authUser);
        return { ok: true };
      }

      if (text === '/misventas' || text === '💰 Mis Ventas') {
        await this.mostrarVentasCampesino(chatId, authUser);
        return { ok: true };
      }

      if (text === '/mispedidos' || text === '📦 Mis Pedidos') {
        if (!authUser) {
          await this.sendMessage(chatId, '🔒 Para consultar tus pedidos personales, primero inicia sesión escribiendo <code>/login</code>.');
          return { ok: true };
        }
        await this.mostrarPedidosComprador(chatId, authUser);
        return { ok: true };
      }

      // ── FLUJO INTERACTIVO DE SOPORTE POR PASOS ──
      if (session.state === 'FORM_NOMBRE') {
        session.data.nombre = text;
        session.state = 'FORM_CORREO';
        await this.sendMessage(chatId, `📧 Perfecto, <b>${text}</b>.\n\nAhora escribe tu <b>Correo Electrónico</b> (para seguimiento y copia):`);
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

        const categoryKeyboard = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📦 Estado de Pedidos & Envíos', callback_data: 'cat_pedidos' }],
              [{ text: '🌱 Productos & Cosechas', callback_data: 'cat_productos' }],
              [{ text: '💳 Pagos & Facturación', callback_data: 'cat_pagos' }],
              [{ text: '🌾 Registro de Campesino', callback_data: 'cat_campesino' }],
              [{ text: '❓ Consulta General', callback_data: 'cat_general' }]
            ]
          }
        };

        await this.sendMessage(chatId, '🏷️ <b>Selecciona la categoría de tu consulta tocando un botón:</b>', categoryKeyboard);
        return { ok: true };
      }

      if (session.state === 'FORM_CATEGORIA') {
        session.data.categoria = text;
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
              asunto: `${session.data.categoria || 'Consulta'}: ${userMsg.substring(0, 45)}...`,
              estado: 'bot'
            });

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

        // Generar respuesta con IA
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

        // Emitir a socket
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

        // Notificar admins (excluyendo el chat del propio usuario para evitar duplicidad visual)
        if (ticket) {
          this.notificarNuevoTicket({ ticket, mensajeInicial: userMsg, excludeChatId: chatId }).catch(() => {});
        }

        session.state = 'CHAT_ACTIVO';
        session.activeTicket = ticket || { id: 1, ticket_code: ticketCode, session_id: sessionId };
        session.activeSessionId = sessionId;

        const confirmationMsg = `
🎫 <b>¡TICKET DE SOPORTE CREADO!</b>
━━━━━━━━━━━━━━━━━━
Código: <code>#${ticketCode}</code>
Cliente: <b>${session.data.nombre}</b>
Categoría: <b>${session.data.categoria}</b>
━━━━━━━━━━━━━━━━━━
🌾 <b>Respuesta de AgroAsistente IA:</b>

${aiReply}
`;
        const actionKeyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👨‍🌾 Hablar con Asesor Humano', callback_data: 'escalate_agent' },
                { text: '✅ Finalizar Consulta', callback_data: 'close_my_ticket' }
              ]
            ]
          }
        };

        await this.sendMessage(chatId, confirmationMsg, actionKeyboard);
        return { ok: true };
      }

      // ── CONVERSACIÓN CONTINUA CON TICKET ACTIVO ──
      if (session.state === 'CHAT_ACTIVO' && session.activeTicket) {
        const ticket = session.activeTicket;
        const sessionId = session.activeSessionId;

        const lower = text.toLowerCase();
        const isEscalate = text === '/asesor' || lower.includes('asesor') || lower.includes('humano') || lower.includes('hablar con alguien') || lower.includes('agente') || lower.includes('persona');

        if (isEscalate) {
          if (this.soporteRepository) {
            await this.soporteRepository.actualizarTicket(ticket.id, { estado: 'agente' });
            await this.soporteRepository.agregarMensaje({
              ticket_id: ticket.id,
              session_id: sessionId,
              id_usuario: null,
              nombre_remitente: 'Sistema',
              rol: 'sistema',
              mensaje: '🔔 Cliente solicitó asesor humano desde Telegram.'
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

          this.notificarSolicitudAsesorHumano({ ticket, excludeChatId: chatId }).catch(() => {});

          await this.sendMessage(chatId, `🔔 <b>¡Solicitud de Asesor Humano Recibida!</b>\n━━━━━━━━━━━━━━━━━━\nHemos notificado a nuestro equipo. Un asesor humano se comunicará contigo directamente por este chat en breves minutos.`);
          return { ok: true };
        }

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

        let currentTicket = ticket;
        if (this.soporteRepository) {
          const dbTicket = await this.soporteRepository.buscarTicketPorId(ticket.id);
          if (dbTicket) currentTicket = dbTicket;
        }

        if (currentTicket.estado === 'agente') {
          // El mensaje ya se guardó y se transmitió al asesor en el panel en tiempo real.
          // No enviamos mensajes repetitivos automáticos para que la conversación fluya limpiamente.
          return { ok: true };
        }

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

            const ongoingKeyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '👨‍🌾 Hablar con Asesor Humano', callback_data: 'escalate_agent' },
                    { text: '✅ Finalizar Consulta', callback_data: 'close_my_ticket' }
                  ]
                ]
              }
            };

            await this.sendMessage(chatId, aiAnswer, ongoingKeyboard);
          } catch (iaErr) {
            console.error('[Telegram IA Followup Error]:', iaErr);
            await this.sendMessage(chatId, `🌾 Recibido. Escribe <b>/asesor</b> si requieres atención humana inmediata.`);
          }
        }

        return { ok: true };
      }

      // ── INICIO DE SOPORTE ──
      const lowerText = text.toLowerCase();
      const wantsSupport = text === '/soporte' || text === '/ayuda' || text === '/ticket' || text === '💬 Soporte' ||
        lowerText.includes('soporte') || lowerText.includes('ayuda') || lowerText.includes('reclamo') || lowerText.includes('asesor');

      if (wantsSupport) {
        await this.iniciarFlujoSoporte(chatId, authUser, session);
        return { ok: true };
      }

      // Comandos Estándar
      if (text.startsWith('/start') || text === '/menu' || text === '🌾 Menú Principal') {
        const kb = this.getPersistentKeyboard(authUser);
        const menuData = this.generarMenuRol(authUser, chatId);
        await this.sendMessage(chatId, menuData.text, {
          reply_markup: {
            ...menuData.reply_markup,
            ...kb
          }
        });
      } else if (text.startsWith('/id') || text === '🆔 Mi ID') {
        await this.sendMessage(chatId, `Tu Chat ID de Telegram es: <code>${chatId}</code>`);
      } else if (text.startsWith('/tienda') || text.startsWith('/catalogo') || text === '🛒 Ver Catálogo' || text === '🌾 Catálogo') {
        await this.sendMessage(chatId, `🛒 Explora cosechas frescas y productos del campo en nuestra web oficial:\n👉 https://delosmontesdemaria.onrender.com/catalogo`);
      } else if (text.startsWith('/pedidos')) {
        await this.sendMessage(chatId, `📦 Realizamos envíos directos desde los Montes de María hasta tu hogar con frescura garantizada.`);
      } else {
        const fallback = authUser
          ? `¡Hola ${authUser.nombre || userName}! 👋\n\nElige una opción en los botones de abajo o escribe <b>/soporte</b> para abrir una consulta.`
          : `¡Hola ${userName}! 👋\n\nToca <b>🔐 Iniciar Sesión</b> para conectar tu cuenta o <b>💬 Soporte</b> para recibir asistencia con IA.`;
        const kb = this.getPersistentKeyboard(authUser);
        await this.sendMessage(chatId, fallback, { reply_markup: kb });
      }

      return { ok: true };
    } catch (err) {
      console.error('[Telegram Webhook Error]:', err);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Inicia el flujo de soporte con categoría interactiva
   */
  async iniciarFlujoSoporte(chatId, authUser, session) {
    const categoryKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 Estado de Pedidos & Envíos', callback_data: 'cat_pedidos' }],
          [{ text: '🌱 Productos & Cosechas', callback_data: 'cat_productos' }],
          [{ text: '💳 Pagos & Facturación', callback_data: 'cat_pagos' }],
          [{ text: '🌾 Registro de Campesino', callback_data: 'cat_campesino' }],
          [{ text: '❓ Consulta General', callback_data: 'cat_general' }]
        ]
      }
    };

    if (authUser) {
      session.data = {
        nombre: authUser.nombre || authUser.username,
        correo: authUser.correo,
        telefono: authUser.telefono || 'Sin registrar'
      };
      session.state = 'FORM_CATEGORIA';
      await this.sendMessage(
        chatId,
        `👋 <b>Centro de Soporte - De los Montes de María</b> 🌾\n━━━━━━━━━━━━━━━━━━\nSesión activa: <b>${authUser.nombre || authUser.username}</b>\n\n🏷️ <b>Selecciona el tema de tu consulta tocando un botón:</b>`,
        categoryKeyboard
      );
    } else {
      session.state = 'FORM_NOMBRE';
      session.data = {};
      await this.sendMessage(
        chatId,
        `👋 <b>Centro de Soporte - De los Montes de María</b> 🌾\n━━━━━━━━━━━━━━━━━━\nVamos a registrar tu consulta personalizada.\n\n📝 <b>Paso 1:</b> ¿Cuál es tu <b>Nombre y Apellido</b>?\n<i>(Escribe tu nombre para continuar o /cancelar para salir)</i>`
      );
    }
  }

  /**
   * Métodos auxiliares de autenticación
   */
  async iniciarLoginConIdentificador(chatId, identifier, session) {
    if (!this.usuarioRepository) {
      await this.sendMessage(chatId, '❌ El servicio de usuarios no está disponible en este momento.');
      return;
    }

    try {
      const cleanTerm = identifier.trim().toLowerCase();
      let user = null;

      if (typeof this.usuarioRepository.buscarPorApodoOCorreo === 'function') {
        user = await this.usuarioRepository.buscarPorApodoOCorreo(cleanTerm);
      } else if (typeof this.usuarioRepository.buscarPorCorreo === 'function') {
        user = await this.usuarioRepository.buscarPorCorreo(cleanTerm);
      }

      if (!user) {
        await this.sendMessage(
          chatId,
          `❌ No encontramos ninguna cuenta registrada con el identificador <b>${cleanTerm}</b>.\n\nPor favor verifica tu usuario o regístrate en nuestra plataforma web:\n👉 https://delosmontesdemaria.onrender.com/registro`
        );
        session.state = 'IDLE';
        return;
      }

      session.state = 'LOGIN_WAIT_AUTH';
      session.data = { authUser: user };

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      this.pendingAuth.set(chatId, {
        code: otpCode,
        userObj: user,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      if (this.emailService && typeof this.emailService.enviarCodigoVerificacionTelegram === 'function') {
        this.emailService.enviarCodigoVerificacionTelegram({
          correo: user.correo,
          nombre: user.nombre || user.username,
          codigo: otpCode
        }).catch((err) => console.error('[Telegram OTP Email Error]:', err));
      }

      const loginPrompt = `
📩 <b>¡CÓDIGO ENVIADO AUTOMÁTICAMENTE!</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> ${user.nombre || user.username}
📧 <b>Correo:</b> <code>${user.correo}</code>
━━━━━━━━━━━━━━━━━━
Hemos enviado un <b>código de seguridad de 6 dígitos</b> a tu correo electrónico.

✍️ <b>Escribe los 6 dígitos aquí en el chat para acceder:</b>

<i>💡 Consejo: Si lo prefieres, también puedes ingresar escribiendo tu contraseña de la web.</i>
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
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    if (this.emailService && typeof this.emailService.enviarCodigoVerificacionTelegram === 'function') {
      this.emailService.enviarCodigoVerificacionTelegram({
        correo: user.correo,
        nombre: user.nombre || user.username,
        codigo: newOtpCode
      }).catch((err) => console.error('[Telegram Resend OTP Error]:', err));
    }

    const resendMsg = `
🔄 <b>¡NUEVO CÓDIGO ENVIADO!</b>
━━━━━━━━━━━━━━━━━━
Hemos enviado un nuevo código de 6 dígitos a:
📧 <b>${user.correo}</b>

✍️ <b>Escribe los 6 dígitos aquí en el chat para acceder:</b>
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

  async mostrarPerfilUsuario(chatId, authUser) {
    if (!authUser) {
      const kb = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔐 Iniciar Sesión', callback_data: 'cmd_login' }]
          ]
        }
      };
      await this.sendMessage(chatId, '🔒 No has iniciado sesión.\nToca el botón para vincular tu cuenta:', kb);
    } else {
      const rolId = Number(authUser.id_rol);
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
`;
      const kb = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚪 Cerrar Sesión', callback_data: 'cmd_logout' }]
          ]
        }
      };
      await this.sendMessage(chatId, perfilMsg, kb);
    }
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
━━━━━━━━━━━━━━━━━━
`;
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `🎫 Ver Tickets (${ticketsAbiertos})`, callback_data: 'cmd_tickets' },
              { text: '🛒 Ver Ventas', callback_data: 'cmd_ventas' }
            ],
            [
              { text: `⚠️ Stock Bajo (${stockCriticoCount})`, callback_data: 'cmd_stock' },
              { text: '🌐 Panel Web', url: 'https://delosmontesdemaria.onrender.com/admin' }
            ]
          ]
        }
      };

      await this.sendMessage(chatId, msg, keyboard);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al cargar resumen: ${err.message}`);
    }
  }

  async mostrarTicketsPendientes(chatId) {
    if (!this.soporteRepository) return;
    try {
      const tickets = await this.soporteRepository.listarTickets();
      const pendientes = (tickets || []).filter((t) => t.estado !== 'cerrado').slice(0, 6);

      if (pendientes.length === 0) {
        await this.sendMessage(chatId, '🎉 <b>¡Excelente!</b> No hay tickets de soporte pendientes en este momento.');
        return;
      }

      let lista = '🎫 <b>TICKETS DE SOPORTE PENDIENTES:</b>\n━━━━━━━━━━━━━━━━━━\n';
      const inlineButtons = [];

      pendientes.forEach((t, idx) => {
        const code = t.ticket_code || t.id;
        const estadoTag = t.estado === 'agente' ? '👨‍🌾 En Atención' : '🤖 IA / Bot';
        lista += `\n<b>${idx + 1}.</b> <code>#${code}</code> | ${estadoTag}\n   👤 <b>${t.nombre_cliente}</b>\n   📝 <i>${t.asunto}</i>\n`;

        inlineButtons.push([
          { text: `💬 Responder #${code}`, callback_data: `reply_tk:${code}` },
          { text: `🔒 Cerrar #${code}`, callback_data: `close_tk:${code}` }
        ]);
      });

      inlineButtons.push([
        { text: '🌐 Abrir en Panel Web', url: 'https://delosmontesdemaria.onrender.com/admin/soporte' }
      ]);

      const keyboard = {
        reply_markup: {
          inline_keyboard: inlineButtons
        }
      };

      await this.sendMessage(chatId, lista, keyboard);
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

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Ver Todas en Web', url: 'https://delosmontesdemaria.onrender.com/admin' }]
          ]
        }
      };

      await this.sendMessage(chatId, lista, keyboard);
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
        lista += `\n📦 <b>${p.nombre}</b>\n   🌾 Stock: <b>${p.stock} unidades</b> ($${Number(p.precio || 0).toLocaleString('es-CO')})\n`;
      });

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Actualizar Stock en Web', url: 'https://delosmontesdemaria.onrender.com/admin' }]
          ]
        }
      };

      await this.sendMessage(chatId, lista, keyboard);
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
        const kb = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Explorar Catálogo', url: 'https://delosmontesdemaria.onrender.com/catalogo' }]
            ]
          }
        };
        await this.sendMessage(chatId, '🛒 No tienes compras registradas aún.\n\n🌾 ¡Explora nuestras cosechas frescas en nuestra plataforma!', kb);
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

