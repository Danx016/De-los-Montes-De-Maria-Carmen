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

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

    // Memoria de respuestas sugeridas por IA para tickets: ticketCode -> suggestedText
    this.cachedAiReplies = new Map();

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
          [{ text: '🛒 Ventas' }, { text: '📦 Productos & Stock' }],
          [{ text: '👥 Usuarios' }, { text: '👤 Mi Perfil' }]
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
      parse_mode: options.parse_mode !== undefined ? options.parse_mode : 'HTML',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...options,
    };
    const res = await this.request('sendMessage', payload);
    // Si falla por error de parsing HTML/Markdown, reintentar automáticamente en texto plano
    if (res && !res.ok && res.description && res.description.toLowerCase().includes('parse')) {
      const fallbackPayload = { ...payload, parse_mode: undefined };
      return await this.request('sendMessage', fallbackPayload);
    }
    return res;
  }

  /**
   * Editar mensaje existente en un chat
   */
  async editMessageText(chatId, messageId, text, options = {}) {
    if (!chatId || !messageId || !text) return;
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: options.parse_mode !== undefined ? options.parse_mode : 'HTML',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...options,
    };
    const res = await this.request('editMessageText', payload);
    if (res && !res.ok && res.description && res.description.toLowerCase().includes('parse')) {
      const fallbackPayload = { ...payload, parse_mode: undefined };
      return await this.request('editMessageText', fallbackPayload);
    }
    return res;
  }

  /**
   * Responder a un callback query para cerrar el spinner táctil en Telegram
   */
  async answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
    if (!callbackQueryId) return;
    return await this.request('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: showAlert,
    });
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
   * Alerta de Nueva Compra / Pedido a Administradores con Botones de 1-Clic
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

      const cleanPhone = String(clientPhone).replace(/\D/g, '');
      const hasPhone = cleanPhone.length >= 7;

      const msg = `
🔔 <b>¡NUEVA COMPRA REGISTRADA!</b>
━━━━━━━━━━━━━━━━━━
🧾 <b>Orden:</b> <code>#ORD-${orderCode}</code>
👤 <b>Cliente:</b> ${clientName}
📞 <b>Teléfono:</b> <code>${clientPhone}</code>
📧 <b>Correo:</b> <code>${clientEmail}</code>
📍 <b>Dirección:</b> ${direccion || 'Montes de María, Colombia'}
💳 <b>Método de Pago:</b> ${metodoPago || 'Contra Entrega'}
💰 <b>Total Pagado:</b> <b>$${formattedTotal} COP</b>

🛒 <b>Productos Solicitados:</b>
${productsList}
━━━━━━━━━━━━━━━━━━
⚡ <b>Gestionar estado de despacho en 1-clic:</b>
`;
      const buttons = [
        [
          { text: '👨‍🌾 En Finca', callback_data: `set_status:${orderCode}:confirmado` },
          { text: '📦 Empacado', callback_data: `set_status:${orderCode}:empaquetado` }
        ],
        [
          { text: '🚚 En Camino', callback_data: `set_status:${orderCode}:en_camino` },
          { text: '🛵 En Reparto', callback_data: `set_status:${orderCode}:en_reparto` }
        ],
        [
          { text: '✅ Marcar Entregado', callback_data: `set_status:${orderCode}:entregado` }
        ]
      ];

      if (hasPhone) {
        const waUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(`Hola ${clientName}, te escribimos de De los Montes de María sobre tu pedido #ORD-${orderCode}.`)}`;
        buttons.push([
          { text: '💬 Abrir WhatsApp con Cliente', url: waUrl }
        ]);
      }

      buttons.push([
        { text: '🛒 Ver Todos los Pedidos', callback_data: 'cmd_ventas' }
      ]);

      const keyboard = {
        reply_markup: {
          inline_keyboard: buttons
        }
      };

      await this.broadcastAdmins(msg, keyboard);
    } catch (err) {
      console.error('[Telegram] Error al notificar compra:', err);
    }
  }

  /**
   * Alerta de Solicitud de Nuevo Vendedor Campesino
   */
  async notificarSolicitudVendedor({ usuario, descripcion, categoria, telefono, direccion }) {
    try {
      const uId = usuario?.id_usuario || usuario?.id;
      const nombre = usuario?.nombre || usuario?.username || 'Productor';
      const correo = usuario?.correo || 'N/A';
      const cleanPhone = String(telefono || usuario?.telefono || '').replace(/\D/g, '');

      const msg = `
🌾 <b>¡NUEVA SOLICITUD DE VENDEDOR CAMPESINO!</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Productor:</b> ${nombre} (ID: <code>#${uId}</code>)
📧 <b>Correo:</b> <code>${correo}</code>
📞 <b>Teléfono:</b> <code>${telefono || usuario?.telefono || 'No registrado'}</code>
📍 <b>Ubicación:</b> ${direccion || usuario?.direccion || 'Montes de María'}
🏷️ <b>Categoría:</b> ${categoria || 'Cosechas y productos locales'}

📝 <b>Descripción del Productor:</b>
<i>"${descripcion || 'Productor campesino de la región de Montes de María'}"</i>
━━━━━━━━━━━━━━━━━━
`;
      const buttons = [
        [
          { text: `✅ Aprobar Vendedor #${uId}`, callback_data: `approve_vendor:${uId}` }
        ]
      ];

      if (cleanPhone.length >= 7) {
        const waUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(`Hola ${nombre}, te contactamos de De los Montes de María para validar tu registro de vendedor campesino.`)}`;
        buttons.push([
          { text: '💬 Contactar por WhatsApp', url: waUrl }
        ]);
      }

      buttons.push([
        { text: '🌐 Panel Web Administrativo', url: 'https://delosmontesdemaria.onrender.com/admin' }
      ]);

      const keyboard = {
        reply_markup: {
          inline_keyboard: buttons
        }
      };

      await this.broadcastAdmins(msg, keyboard);
    } catch (err) {
      console.error('[Telegram] Error al notificar solicitud de vendedor:', err);
    }
  }

  /**
   * Alerta de Stock Bajo
   */
  async notificarStockBajo({ producto, stockRestante }) {
    try {
      const prodName = producto?.nombre || producto?.nombre_producto || 'Producto';
      const pId = producto?.id_producto || producto?.id || '';
      const msg = `
⚠️ <b>¡ALERTA DE STOCK CRÍTICO!</b>
━━━━━━━━━━━━━━━━━━
📦 <b>Producto:</b> ${prodName} (ID: <code>#${pId}</code>)
🌾 <b>Stock Restante:</b> <code>${stockRestante} unidades</code>
🏷️ <b>Categoría:</b> ${producto?.categoria || 'General'}
━━━━━━━━━━━━━━━━━━
💡 <i>Puedes reabastecerlo escribiendo:</i> <code>/stock ${pId} [cantidad]</code>
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
        nuevoEstado === 'en_reparto' ? '🛵' :
        nuevoEstado === 'empaquetado' ? '📦' :
        nuevoEstado === 'confirmado' || nuevoEstado === 'en_preparacion' ? '👨‍🌾' : '⏳';

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
   * Notificar Nuevo Ticket de Soporte a Administradores con Detección de Urgencia e IA
   */
  async notificarNuevoTicket({ ticket, mensajeInicial, excludeChatId = null }) {
    try {
      const ticketCode = ticket.ticket_code || ticket.session_id;
      const textToCheck = `${ticket.asunto || ''} ${mensajeInicial || ''}`.toLowerCase();
      
      // Detección de Urgencia / Reclamo con IA / Palabras clave
      const urgentWords = ['urgente', 'dañado', 'roto', 'reclam', 'estafa', 'no llegó', 'no me llego', 'demorado', 'tardanza', 'podrido', 'mal estado', 'error', 'perdido', 'dinero', 'cobro'];
      const isUrgent = urgentWords.some((w) => textToCheck.includes(w));
      const headerTitle = isUrgent ? '🔴 <b>¡URGENTE / RECLAMO DE CLIENTE!</b>' : '🎫 <b>NUEVA CONSULTA DE SOPORTE</b>';

      // Generar respuesta sugerida por IA preliminar
      let suggestedAiReply = '';
      if (this.iaService && typeof this.iaService.generarRespuestaSoporte === 'function') {
        try {
          suggestedAiReply = await this.iaService.generarRespuestaSoporte(
            mensajeInicial || ticket.asunto || 'Consulta de cliente',
            `Cliente: ${ticket.nombre_cliente || 'Usuario'}`
          );
        } catch (_) {}
      }

      if (!suggestedAiReply) {
        suggestedAiReply = `Hola ${ticket.nombre_cliente || ''}, con mucho gusto te ayudamos desde De los Montes de María con tu consulta sobre "${ticket.asunto || 'tu pedido'}". En este momento estamos revisando tu caso para darte pronta solución.`;
      }

      this.cachedAiReplies.set(String(ticketCode).toUpperCase().replace('#', '').trim(), suggestedAiReply);

      const cleanPhone = String(ticket.telefono_cliente || '').replace(/\D/g, '');
      const hasPhone = cleanPhone.length >= 7;

      const msg = `
${headerTitle}
━━━━━━━━━━━━━━━━━━
Código: <code>#${ticketCode}</code>
Cliente: <b>${ticket.nombre_cliente || 'Usuario'}</b>
Correo: <code>${ticket.correo_cliente || 'N/A'}</code>
Teléfono: <code>${ticket.telefono_cliente || 'No registrado'}</code>
Asunto: <b>${ticket.asunto || 'Consulta'}</b>

📝 <b>Mensaje del Cliente:</b>
<i>"${mensajeInicial || 'Solicitud de información'}"</i>
━━━━━━━━━━━━━━━━━━
💡 <b>Respuesta Sugerida por IA:</b>
<i>"${suggestedAiReply.slice(0, 240)}${suggestedAiReply.length > 240 ? '...' : ''}"</i>
`;
      const buttons = [
        [
          { text: `⚡ Enviar Respuesta de IA en 1-Clic`, callback_data: `ai_reply:${ticketCode}` }
        ],
        [
          { text: `💬 Responder Manual`, callback_data: `reply_tk:${ticketCode}` },
          { text: `🔒 Cerrar Ticket`, callback_data: `close_tk:${ticketCode}` }
        ],
        [
          { text: '📍 Info Envíos', callback_data: `macro:${ticketCode}:envios` },
          { text: '🧾 Factura', callback_data: `macro:${ticketCode}:factura` },
          { text: '🌱 Calidad', callback_data: `macro:${ticketCode}:calidad` }
        ]
      ];

      if (hasPhone) {
        const waUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(`Hola ${ticket.nombre_cliente || ''}, te contactamos del soporte oficial de De los Montes de María respecto a tu ticket #${ticketCode}.`)}`;
        buttons.push([
          { text: '💬 Abrir WhatsApp con el Cliente', url: waUrl }
        ]);
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: buttons
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
      const cleanPhone = String(ticket.telefono_cliente || '').replace(/\D/g, '');
      const hasPhone = cleanPhone.length >= 7;

      const msg = `
🚨 <b>¡CLIENTE SOLICITA ASESOR HUMANO!</b>
━━━━━━━━━━━━━━━━━━
Ticket: <code>#${ticketCode}</code>
Cliente: <b>${ticket.nombre_cliente}</b>
Teléfono: <code>${ticket.telefono_cliente || 'N/A'}</code>
Correo: <code>${ticket.correo_cliente || 'N/A'}</code>
Asunto: <b>${ticket.asunto}</b>
━━━━━━━━━━━━━━━━━━
⚡ <i>Toca el botón de abajo para atender directamente desde Telegram:</i>
`;
      const buttons = [
        [
          { text: `💬 Atender #${ticketCode} Ahora`, callback_data: `reply_tk:${ticketCode}` },
          { text: `🔒 Cerrar Ticket`, callback_data: `close_tk:${ticketCode}` }
        ]
      ];

      if (hasPhone) {
        const waUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(`Hola ${ticket.nombre_cliente}, te atendemos desde el soporte de De los Montes de María sobre tu solicitud #${ticketCode}.`)}`;
        buttons.push([
          { text: '💬 Escribirle por WhatsApp', url: waUrl }
        ]);
      }

      buttons.push([
        { text: `🌐 Abrir en Panel Web`, url: 'https://delosmontesdemaria.onrender.com/admin/soporte' }
      ]);

      const keyboard = {
        reply_markup: {
          inline_keyboard: buttons
        }
      };

      await this.broadcastAdmins(msg, keyboard, excludeChatId);
    } catch (err) {
      console.error('[Telegram] Error al notificar asesor humano:', err);
    }
  }

  /**
   * Notificar cuando un cliente escribe un nuevo mensaje en un ticket
   */
  async notificarMensajeCliente({ ticket, mensaje, nombreRemitente = null, excludeChatId = null }) {
    try {
      const ticketCode = ticket.ticket_code || ticket.session_id || ticket.id;
      const cleanCode = String(ticketCode).toUpperCase().replace('#', '').trim();
      const clientName = nombreRemitente || ticket.nombre_cliente || 'Cliente';
      
      const msg = `💬 <b>${clientName}</b> (<code>#${cleanCode}</code>):\n${mensaje}`;
      
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `💬 Responder a #${cleanCode}`, callback_data: `reply_tk:${cleanCode}` },
              { text: `🔒 Cerrar #${cleanCode}`, callback_data: `close_tk:${cleanCode}` }
            ]
          ]
        }
      };

      // Activar automáticamente el modo chat en este ticket para todos los administradores
      for (const subscriberId of this.subscribers) {
        if (excludeChatId && String(subscriberId) === String(excludeChatId)) continue;
        let s = this.sessions.get(subscriberId);
        if (!s) {
          s = { state: 'WAITING_TICKET_REPLY', data: {}, activeTicket: ticket, activeSessionId: ticket.session_id, replyTicketCode: cleanCode };
          this.sessions.set(subscriberId, s);
        } else if (s.state === 'IDLE' || s.state === 'WAITING_TICKET_REPLY') {
          s.state = 'WAITING_TICKET_REPLY';
          s.replyTicketCode = cleanCode;
        }
      }

      await this.broadcastAdmins(msg, keyboard, excludeChatId);
    } catch (err) {
      console.error('[Telegram] Error al notificar mensaje cliente:', err);
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
              { text: '📦 Gestionar Productos', callback_data: 'cmd_productos' },
              { text: '👥 Gestionar Usuarios', callback_data: 'cmd_usuarios' }
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
   * Persistencia de sesión de Telegram en Base de Datos (para evitar cierres por reinicio de servidor)
   */
  async guardarSesionTelegram(chatId, user) {
    try {
      const strChatId = String(chatId);
      const userObj = {
        id_usuario: user.id_usuario || user.id,
        id: user.id_usuario || user.id,
        nombre: user.nombre,
        apodo: user.apodo,
        correo: user.correo,
        telefono: user.telefono,
        contrasena: user.contrasena,
        id_rol: Number(user.id_rol),
        rolNombre: Number(user.id_rol) === 1 ? 'Administrador' : Number(user.id_rol) === 4 ? 'Asesor' : Number(user.id_rol) === 2 ? 'Campesino' : 'Comprador'
      };
      this.authenticatedUsers.set(strChatId, userObj);
      if (Number(user.id_rol) === 1 || Number(user.id_rol) === 4) {
        this.registerSubscriber(strChatId);
      }
      const db = require('../persistence/Database');
      const sql = `INSERT INTO telegram_sesiones (chat_id, id_usuario) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_usuario = VALUES(id_usuario), updated_at = CURRENT_TIMESTAMP`;
      await new Promise((resolve) => db.query(sql, [strChatId, userObj.id_usuario], () => resolve()));
    } catch (err) {
      console.warn('[Telegram guardarSesion Error]:', err.message);
    }
  }

  async obtenerSesionTelegram(chatId) {
    try {
      const strChatId = String(chatId);
      if (this.authenticatedUsers.has(strChatId)) {
        return this.authenticatedUsers.get(strChatId);
      }
      const db = require('../persistence/Database');
      const sql = `SELECT u.* FROM telegram_sesiones ts JOIN usuarios u ON ts.id_usuario = u.id_usuario WHERE ts.chat_id = ? LIMIT 1`;
      const rows = await new Promise((resolve, reject) => {
        db.query(sql, [strChatId], (err, res) => {
          if (err) return resolve([]);
          resolve(res || []);
        });
      });

      if (rows && rows.length > 0) {
        const u = rows[0];
        const userObj = {
          id_usuario: u.id_usuario,
          id: u.id_usuario,
          nombre: u.nombre,
          apodo: u.apodo,
          correo: u.correo,
          telefono: u.telefono,
          contrasena: u.contrasena,
          id_rol: Number(u.id_rol),
          rolNombre: Number(u.id_rol) === 1 ? 'Administrador' : Number(u.id_rol) === 4 ? 'Asesor' : Number(u.id_rol) === 2 ? 'Campesino' : 'Comprador'
        };
        this.authenticatedUsers.set(strChatId, userObj);
        if (Number(u.id_rol) === 1 || Number(u.id_rol) === 4) {
          this.registerSubscriber(strChatId);
        }
        return userObj;
      }
      return null;
    } catch (err) {
      console.warn('[Telegram obtenerSesion Error]:', err.message);
      return null;
    }
  }

  async eliminarSesionTelegram(chatId) {
    try {
      const strChatId = String(chatId);
      this.authenticatedUsers.delete(strChatId);
      const db = require('../persistence/Database');
      await new Promise((resolve) => db.query(`DELETE FROM telegram_sesiones WHERE chat_id = ?`, [strChatId], () => resolve()));
    } catch (err) {
      console.warn('[Telegram eliminarSesion Error]:', err.message);
    }
  }

  /**
   * Persistencia de Códigos OTP en Base de Datos
   */
  async guardarCodigoOTPPendiente(chatId, user, code, expiresAt) {
    try {
      const strChatId = String(chatId);
      const userId = user.id_usuario || user.id;
      this.pendingAuth.set(strChatId, {
        code: String(code),
        userObj: user,
        expiresAt: Number(expiresAt)
      });
      const db = require('../persistence/Database');
      const sql = `INSERT INTO telegram_auth_codigos (chat_id, id_usuario, codigo, expires_at) 
                   VALUES (?, ?, ?, ?) 
                   ON DUPLICATE KEY UPDATE id_usuario = VALUES(id_usuario), codigo = VALUES(codigo), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP`;
      await new Promise((resolve) => db.query(sql, [strChatId, userId, String(code), expiresAt], () => resolve()));
    } catch (err) {
      console.warn('[Telegram guardarCodigoOTP Error]:', err.message);
    }
  }

  async obtenerCodigoOTPPendiente(chatId) {
    try {
      const strChatId = String(chatId);
      if (this.pendingAuth.has(strChatId)) {
        const mem = this.pendingAuth.get(strChatId);
        if (mem && mem.expiresAt > Date.now()) {
          return mem;
        }
      }
      const db = require('../persistence/Database');
      const sql = `SELECT tac.codigo, tac.expires_at, u.* 
                   FROM telegram_auth_codigos tac 
                   JOIN usuarios u ON tac.id_usuario = u.id_usuario 
                   WHERE tac.chat_id = ? LIMIT 1`;
      const rows = await new Promise((resolve) => {
        db.query(sql, [strChatId], (err, res) => {
          if (err) return resolve([]);
          resolve(res || []);
        });
      });

      if (rows && rows.length > 0) {
        const r = rows[0];
        const userObj = {
          id_usuario: r.id_usuario,
          id: r.id_usuario,
          nombre: r.nombre,
          apodo: r.apodo,
          correo: r.correo,
          telefono: r.telefono,
          contrasena: r.contrasena,
          id_rol: Number(r.id_rol),
          rolNombre: Number(r.id_rol) === 1 ? 'Administrador' : Number(r.id_rol) === 4 ? 'Asesor' : Number(r.id_rol) === 2 ? 'Campesino' : 'Comprador'
        };
        const pendingObj = {
          code: String(r.codigo),
          userObj,
          expiresAt: Number(r.expires_at)
        };
        this.pendingAuth.set(strChatId, pendingObj);
        return pendingObj;
      }
      return null;
    } catch (err) {
      console.warn('[Telegram obtenerCodigoOTP Error]:', err.message);
      return null;
    }
  }

  async eliminarCodigoOTPPendiente(chatId) {
    try {
      const strChatId = String(chatId);
      this.pendingAuth.delete(strChatId);
      const db = require('../persistence/Database');
      await new Promise((resolve) => db.query(`DELETE FROM telegram_auth_codigos WHERE chat_id = ?`, [strChatId], () => resolve()));
    } catch (err) {
      console.warn('[Telegram eliminarCodigoOTP Error]:', err.message);
    }
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
        if (clientChatId && String(clientChatId) !== String(chatId)) {
          const clientMsg = `👨‍🌾 <b>${nombreAsesor}:</b>\n${replyText}`;
          await this.sendMessage(clientChatId, clientMsg);
        }
      }

      // 5. Mantener la sesión activa en el ticket para conversación 100% directa y limpia (sin mensajes de confirmación)
      let session = this.sessions.get(chatId);
      if (!session) {
        session = { state: 'WAITING_TICKET_REPLY', data: {}, activeTicket: ticket, activeSessionId: ticket.session_id, replyTicketCode: cleanCode };
        this.sessions.set(chatId, session);
      } else {
        session.state = 'WAITING_TICKET_REPLY';
        session.replyTicketCode = cleanCode;
      }
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

        const authUser = (await this.obtenerSesionTelegram(cbChatId)) || this.authenticatedUsers.get(cbChatId) || null;
        const rolId = authUser ? Number(authUser.id_rol) : null;
        const isAdminOrAdvisor = rolId === 1 || rolId === 4;

        // ── GESTIÓN DE ESTADO DE PEDIDOS EN 1-CLIC (ADMIN) ──
        if (cbData.startsWith('set_status:')) {
          const parts = cbData.split(':');
          const idCompra = parts[1];
          const nuevoEstado = parts[2];
          await this.cambiarEstadoPedidoDesdeTelegram(cbChatId, idCompra, nuevoEstado, authUser);
          return { ok: true };
        }

        // ── RESPUESTA SUGERIDA POR IA EN 1-CLIC (ADMIN) ──
        if (cbData.startsWith('ai_reply:')) {
          const ticketCode = cbData.replace('ai_reply:', '').trim().toUpperCase();
          const suggestedText = this.cachedAiReplies ? this.cachedAiReplies.get(ticketCode) : null;
          if (suggestedText) {
            await this.responderTicket(cbChatId, ticketCode, suggestedText, authUser);
            await this.sendMessage(cbChatId, `⚡ <b>Respuesta de IA enviada exitosamente al ticket #${ticketCode}.</b>`);
          } else {
            await this.sendMessage(cbChatId, `⚠️ No hay respuesta de IA en memoria para #${ticketCode}. Escribe tu respuesta manualmente con <code>/responder ${ticketCode} [tu mensaje]</code>.`);
          }
          return { ok: true };
        }

        // ── RESPUESTAS RÁPIDAS PREDEFINIDAS / MACROS (ADMIN) ──
        if (cbData.startsWith('macro:')) {
          const parts = cbData.split(':');
          const ticketCode = parts[1]?.trim().toUpperCase();
          const macroType = parts[2];
          await this.enviarMacroRespuesta(cbChatId, ticketCode, macroType, authUser);
          return { ok: true };
        }

        // ── APROBACIÓN DE VENDEDOR CAMPESINO EN 1-CLIC (ADMIN) ──
        if (cbData.startsWith('approve_vendor:')) {
          const vendorId = cbData.replace('approve_vendor:', '').trim();
          await this.aprobarVendedorDesdeTelegram(cbChatId, vendorId, authUser);
          return { ok: true };
        }

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
          await this.eliminarSesionTelegram(cbChatId);
          await this.eliminarCodigoOTPPendiente(cbChatId);
          this.sessions.set(cbChatId, { state: 'IDLE', data: {}, activeTicket: null, activeSessionId: null });
          const kb = this.getPersistentKeyboard(null);
          await this.sendMessage(cbChatId, '👋 <b>Sesión cerrada exitosamente.</b>\nHas vuelto al modo invitado.', { reply_markup: kb });
          return { ok: true };
        }

        if (cbData === 'cmd_resumen' || cbData === 'cmd_metricas') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarMetricasNegocio(cbChatId);
          } else {
            await this.sendMessage(cbChatId, '🔒 Esta opción requiere permisos de Administrador.');
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData === 'cmd_tickets') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarTicketsPendientes(cbChatId);
          } else {
            await this.sendMessage(cbChatId, '🔒 Esta opción requiere permisos de Administrador.');
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData === 'cmd_ventas' || cbData === 'cmd_pedidos') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarUltimasVentas(cbChatId);
          } else {
            await this.sendMessage(cbChatId, '🔒 Esta opción requiere permisos de Administrador.');
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData === 'cmd_stock') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarStockCritico(cbChatId);
          } else {
            await this.sendMessage(cbChatId, '🔒 Esta opción requiere permisos de Administrador.');
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        // ── GESTIÓN DE PRODUCTOS Y PRECIOS EN 1-CLIC (ADMIN) ──
        if (cbData.startsWith('prod_toggle:')) {
          const prodId = cbData.replace('prod_toggle:', '').trim();
          await this.alternarEstadoProducto(cbChatId, prodId, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, 'Estado de producto actualizado');
          return { ok: true };
        }

        if (cbData.startsWith('prod_stock_add:')) {
          const parts = cbData.split(':');
          const prodId = parts[1];
          const delta = parseInt(parts[2], 10) || 0;
          await this.ajustarStockProducto(cbChatId, prodId, delta, false, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, `Stock ${delta >= 0 ? '+' : ''}${delta} aplicado`);
          return { ok: true };
        }

        if (cbData.startsWith('prod_stock_set:')) {
          const parts = cbData.split(':');
          const prodId = parts[1];
          const val = parseInt(parts[2], 10) || 0;
          await this.ajustarStockProducto(cbChatId, prodId, val, true, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, `Stock fijado en ${val}`);
          return { ok: true };
        }

        if (cbData.startsWith('prod_price_set:')) {
          const parts = cbData.split(':');
          const prodId = parts[1];
          const price = parseFloat(parts[2]) || 0;
          await this.ajustarPrecioProducto(cbChatId, prodId, price, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, `Precio actualizado a $${price.toLocaleString('es-CO')}`);
          return { ok: true };
        }

        if (cbData.startsWith('prod_view:')) {
          const prodId = cbData.replace('prod_view:', '').trim();
          await this.mostrarTarjetaProducto(cbChatId, prodId, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData === 'cmd_productos') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarMenuGestionProductos(cbChatId, '', 1);
          } else {
            await this.sendMessage(cbChatId, '🔒 Esta opción requiere permisos de Administrador.');
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData.startsWith('prod_page:')) {
          const parts = cbData.split(':');
          const targetPage = parseInt(parts[1], 10) || 1;
          const search = parts.slice(2).join(':') || '';
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarMenuGestionProductos(cbChatId, search, targetPage, callbackQuery.message?.message_id);
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData === 'noop') {
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        // ── GESTIÓN DE USUARIOS EN 1-CLIC (ADMIN) ──
        if (cbData.startsWith('usr_toggle:')) {
          const userId = cbData.replace('usr_toggle:', '').trim();
          await this.alternarBloqueoUsuario(cbChatId, userId, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, 'Estado de cuenta actualizado');
          return { ok: true };
        }

        if (cbData.startsWith('usr_del_ask:')) {
          const userId = cbData.replace('usr_del_ask:', '').trim();
          await this.preguntarEliminarUsuario(cbChatId, userId, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData.startsWith('usr_del_confirm:')) {
          const userId = cbData.replace('usr_del_confirm:', '').trim();
          await this.eliminarUsuarioDesdeTelegram(cbChatId, userId, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, 'Usuario eliminado');
          return { ok: true };
        }

        if (cbData.startsWith('usr_role_menu:')) {
          const userId = cbData.replace('usr_role_menu:', '').trim();
          await this.mostrarMenuCambiarRolUsuario(cbChatId, userId, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData.startsWith('usr_role_set:')) {
          const parts = cbData.split(':');
          const userId = parts[1];
          const newRoleId = parseInt(parts[2], 10);
          await this.cambiarRolUsuario(cbChatId, userId, newRoleId, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, 'Rol actualizado con éxito');
          return { ok: true };
        }

        if (cbData.startsWith('usr_credit_add:')) {
          const parts = cbData.split(':');
          const userId = parts[1];
          const amount = parseFloat(parts[2]) || 0;
          await this.ajustarSaldoUsuario(cbChatId, userId, amount, true, authUser, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id, `Saldo acreditado: +$${amount.toLocaleString('es-CO')}`);
          return { ok: true };
        }

        if (cbData.startsWith('usr_view:')) {
          const userId = cbData.replace('usr_view:', '').trim();
          await this.mostrarTarjetaUsuario(cbChatId, userId, callbackQuery.message?.message_id);
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData === 'cmd_usuarios') {
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarMenuGestionUsuarios(cbChatId, '', 1);
          } else {
            await this.sendMessage(cbChatId, '🔒 Esta opción requiere permisos de Administrador.');
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData.startsWith('usr_page:')) {
          const parts = cbData.split(':');
          const targetPage = parseInt(parts[1], 10) || 1;
          const search = parts.slice(2).join(':') || '';
          if (isAdminOrAdvisor || cbChatId === String(this.adminChatId)) {
            await this.mostrarMenuGestionUsuarios(cbChatId, search, targetPage, callbackQuery.message?.message_id);
          }
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        // ── RESPUESTA Y CIERRE DE TICKETS VÍA BOTONES INLINE ──
        if (cbData.startsWith('reply_tk:')) {
          const ticketCode = cbData.replace('reply_tk:', '').trim().toUpperCase();
          session.state = 'WAITING_TICKET_REPLY';
          session.replyTicketCode = ticketCode;
          await this.sendMessage(cbChatId, `✍️ Escribe tu <b>respuesta</b> para el ticket <code>#${ticketCode}</code>:\n<i>(O escribe /cancelar para salir)</i>`);
          await this.answerCallbackQuery(callbackQuery.id);
          return { ok: true };
        }

        if (cbData.startsWith('close_tk:')) {
          const ticketCode = cbData.replace('close_tk:', '').trim().toUpperCase();
          if (this.soporteRepository) {
            const t = await this.soporteRepository.buscarTicketPorCodigo(ticketCode);
            if (t) {
              await this.soporteRepository.actualizarTicket(t.id, {
                estado: 'cerrado',
                id_agente: authUser?.id_usuario || t.id_agente,
                nombre_agente: authUser?.nombre || 'Administrador'
              });
              const msgCierre = await this.soporteRepository.agregarMensaje({
                ticket_id: t.id,
                session_id: t.session_id,
                id_usuario: authUser?.id_usuario || null,
                nombre_remitente: 'Sistema',
                rol: 'sistema',
                mensaje: '🔒 El ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.'
              });
              if (this.socketHandler) {
                this.socketHandler.emitirNuevoMensaje(t.session_id, {
                  id: msgCierre.id,
                  ticket_id: t.id,
                  session_id: t.session_id,
                  remitente: 'sistema',
                  nombre_remitente: 'Sistema',
                  mensaje: '🔒 El ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.',
                  fecha: new Date().toISOString()
                });
                this.socketHandler.emitirTicketCerrado(t.session_id, t.id, '✅ Tu ticket ha sido marcado como resuelto y cerrado.');
              }
              await this.sendMessage(cbChatId, `✅ <b>Ticket #${ticketCode} cerrado exitosamente.</b>`);
            }
          }
          await this.answerCallbackQuery(callbackQuery.id, 'Ticket cerrado');
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
          const ticketCode = cbData.replace('reply_tk:', '').replace('#', '').trim().toUpperCase();
          session.state = 'WAITING_TICKET_REPLY';
          session.replyTicketCode = ticketCode;
          await this.sendMessage(
            cbChatId,
            `✍️ <b>Modo Respuesta Activado para #${ticketCode}</b>\n━━━━━━━━━━━━━━━━━━\nEscribe a continuación el mensaje que deseas enviar al cliente:\n<i>(O escribe /cancelar para salir)</i>`
          );
          return { ok: true };
        }

        // 1-Click Cerrar Ticket
        if (cbData.startsWith('close_tk:')) {
          const ticketCode = cbData.replace('close_tk:', '').replace('#', '').trim().toUpperCase();
          if (this.soporteRepository) {
            const t = await this.soporteRepository.buscarTicketPorCodigo(ticketCode);
            if (t) {
              await this.soporteRepository.actualizarTicket(t.id, {
                estado: 'cerrado',
                id_agente: authUser?.id_usuario || t.id_agente,
                nombre_agente: authUser?.nombre || 'Administrador'
              });
              const msgCierre = await this.soporteRepository.agregarMensaje({
                ticket_id: t.id,
                session_id: t.session_id,
                id_usuario: authUser?.id_usuario || null,
                nombre_remitente: 'Sistema',
                rol: 'sistema',
                mensaje: '🔒 El ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.'
              });
              if (this.socketHandler) {
                this.socketHandler.emitirNuevoMensaje(t.session_id, {
                  id: msgCierre.id,
                  ticket_id: t.id,
                  session_id: t.session_id,
                  remitente: 'sistema',
                  nombre_remitente: 'Sistema',
                  mensaje: '🔒 El ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.',
                  fecha: new Date().toISOString()
                });
                this.socketHandler.emitirTicketCerrado(t.session_id, t.id, '✅ Tu ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.');
              }
              if (t.session_id && t.session_id.startsWith('tg_')) {
                const parts = t.session_id.split('_');
                const clientChatId = parts[1];
                if (clientChatId && String(clientChatId) !== String(cbChatId)) {
                  await this.sendMessage(clientChatId, `✅ Tu ticket de soporte <code>#${ticketCode}</code> ha sido marcado como resuelto y cerrado. ¡Muchas gracias por contactarnos! 🌾`);
                }
              }
              await this.sendMessage(cbChatId, `✅ <b>Ticket #${ticketCode} cerrado exitosamente.</b>`);
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

      const authUser = (await this.obtenerSesionTelegram(chatId)) || this.authenticatedUsers.get(chatId) || null;
      const rolId = authUser ? Number(authUser.id_rol) : null;
      const isAdminOrAdvisor = rolId === 1 || rolId === 4;

      // ── MODO CHAT FLUIDO CON TICKET (PARA ADMINS Y ASESORES) ──
      const isMenuOrCommand = text.startsWith('/') ||
        ['📊 Resumen', '🎫 Tickets', '🛒 Ventas', '⚠️ Stock', '🌾 Catálogo', '👤 Mi Perfil', '🚪 Cerrar Sesión', '🔐 Iniciar Sesión', '💬 Soporte', '📦 Mis Pedidos', '🌾 Mis Productos', '💰 Mis Ventas'].includes(text);

      if (session.state === 'WAITING_TICKET_REPLY' && session.replyTicketCode && !isMenuOrCommand) {
        const code = session.replyTicketCode;
        await this.responderTicket(chatId, code, text, authUser);
        return { ok: true };
      }

      if (isMenuOrCommand && session.state === 'WAITING_TICKET_REPLY') {
        session.state = 'IDLE';
        session.replyTicketCode = null;
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
        await this.eliminarCodigoOTPPendiente(chatId);
        const kb = this.getPersistentKeyboard(authUser);
        await this.sendMessage(chatId, '🔄 Proceso cancelado.', { reply_markup: kb });
        return { ok: true };
      }

      // ── COMANDOS DE ATENCIÓN Y CIERRE DE TICKETS CON CÓDIGO (PARA ADMINS / ASESORES) ──
      if (text.startsWith('/cerrar ') || text.startsWith('/cerrarticket ')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        const ticketCode = text.replace(/^\/(cerrar|cerrarticket)\s+/, '').replace('#', '').trim().toUpperCase();
        if (this.soporteRepository) {
          const t = await this.soporteRepository.buscarTicketPorCodigo(ticketCode);
          if (t) {
            await this.soporteRepository.actualizarTicket(t.id, {
              estado: 'cerrado',
              id_agente: authUser?.id_usuario || t.id_agente,
              nombre_agente: authUser?.nombre || 'Administrador'
            });
            const msgCierre = await this.soporteRepository.agregarMensaje({
              ticket_id: t.id,
              session_id: t.session_id,
              id_usuario: authUser?.id_usuario || null,
              nombre_remitente: 'Sistema',
              rol: 'sistema',
              mensaje: '🔒 El ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.'
            });
            if (this.socketHandler) {
              this.socketHandler.emitirNuevoMensaje(t.session_id, {
                id: msgCierre.id,
                ticket_id: t.id,
                session_id: t.session_id,
                remitente: 'sistema',
                nombre_remitente: 'Sistema',
                mensaje: '🔒 El ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.',
                fecha: new Date().toISOString()
              });
              this.socketHandler.emitirTicketCerrado(t.session_id, t.id, '✅ Tu ticket ha sido marcado como resuelto y cerrado por el equipo de soporte.');
            }
            if (t.session_id && t.session_id.startsWith('tg_')) {
              const parts = t.session_id.split('_');
              const clientChatId = parts[1];
              if (clientChatId && String(clientChatId) !== String(chatId)) {
                await this.sendMessage(clientChatId, `✅ Tu ticket de soporte <code>#${ticketCode}</code> ha sido cerrado y resuelto por el equipo de soporte. ¡Muchas gracias! 🌾`);
              }
            }
            await this.sendMessage(chatId, `✅ <b>Ticket #${ticketCode} cerrado exitosamente.</b>`);
          } else {
            await this.sendMessage(chatId, `❌ No se encontró ningún ticket con el código <code>#${ticketCode}</code>.`);
          }
        }
        return { ok: true };
      }

      if (text.startsWith('/responder ') || text.startsWith('/atender ')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        const afterCmd = text.replace(/^\/(responder|atender)\s+/, '').trim();
        const parts = afterCmd.split(' ');
        const ticketCode = parts[0].replace('#', '').trim().toUpperCase();
        const replyMsg = parts.slice(1).join(' ').trim();

        if (!replyMsg) {
          session.state = 'WAITING_TICKET_REPLY';
          session.replyTicketCode = ticketCode;
          await this.sendMessage(
            chatId,
            `✍️ <b>Modo Respuesta Activado para Ticket #${ticketCode}</b>\n━━━━━━━━━━━━━━━━━━\nEscribe a continuación el mensaje que deseas enviar al cliente:\n<i>(O escribe /cancelar para salir)</i>`
          );
          return { ok: true };
        }

        await this.responderTicket(chatId, ticketCode, replyMsg, authUser);
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
        await this.eliminarSesionTelegram(chatId);
        await this.eliminarCodigoOTPPendiente(chatId);
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

      // ── VALIDACIÓN INTELIGENTE DE CÓDIGO OTP O CONTRASEÑA ──
      const cleanDigits = text.replace(/\D/g, '').trim();
      const isSixDigits = cleanDigits.length === 6 && text.trim().length <= 8;
      const isLoginState = session.state === 'LOGIN_WAIT_CODE' || session.state === 'LOGIN_WAIT_AUTH';
      const pending = await this.obtenerCodigoOTPPendiente(chatId);

      if (isLoginState || (isSixDigits && pending)) {
        const lower = text.toLowerCase();
        if (lower === '/reenviar' || lower === 'reenviar' || lower === 'reenviar codigo' || lower === '/resend' || lower === '/codigo') {
          await this.reenviarCodigoOTP(chatId);
          return { ok: true };
        }

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
        if (pending && cleanDigits.length === 6 && cleanDigits === String(pending.code)) {
          if (Date.now() <= pending.expiresAt) {
            loginSuccess = true;
          } else {
            const retryKeyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 Reenviar nuevo código', callback_data: 'resend_otp' },
                    { text: '❌ Cancelar', callback_data: 'cmd_logout' }
                  ]
                ]
              }
            };
            await this.sendMessage(chatId, '⌛ El código de 6 dígitos ha vencido. Puedes ingresar con tu <b>contraseña de la web</b> o pulsar reenviar código.', retryKeyboard);
            return { ok: true };
          }
        }

        // 2. Contraseña del usuario (Bcrypt)
        if (!loginSuccess && user.contrasena && text.length >= 4 && !isSixDigits) {
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
          await this.guardarSesionTelegram(chatId, user);
          await this.eliminarCodigoOTPPendiente(chatId);
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
            `❌ <b>Código o contraseña no válidos</b>\n━━━━━━━━━━━━━━━━━━\nEscribe directamente:\n🔑 Tu <b>contraseña de la web</b>\n— o —\n📩 El <b>código de 6 dígitos</b> que enviamos a <code>${user.correo}</code>.\n\n<i>(Escribe /cancelar para salir)</i>`,
            retryKeyboard
          );
          return { ok: true };
        }
      }

      // ── COMANDOS ADMINISTRATIVOS & GESTIÓN DE NEGOCIO ──
      if (text === '/admin' || text === '/resumen' || text === '/metricas' || text === '📊 Resumen') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador. Escribe <code>/login</code>.');
          return { ok: true };
        }
        await this.mostrarMetricasNegocio(chatId);
        return { ok: true };
      }

      if (text === '/pedidos' || text === '/ventas' || text === '🛒 Ventas') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarUltimasVentas(chatId);
        return { ok: true };
      }

      if (text.startsWith('/cupon') || text.startsWith('/crearcupon')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.crearCuponDesdeTelegram(chatId, text, authUser);
        return { ok: true };
      }

      if (text === '/productos' || text === '📦 Productos & Stock' || text.startsWith('/producto') || text.startsWith('/productos')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        const term = text.replace(/^\/(productos|producto)\s*/i, '').trim();
        await this.mostrarMenuGestionProductos(chatId, term, 1);
        return { ok: true };
      }

      if (text === '/usuarios' || text === '👥 Usuarios' || text.startsWith('/usuario') || text.startsWith('/usuarios')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        const term = text.replace(/^\/(usuarios|usuario)\s*/i, '').trim();
        await this.mostrarMenuGestionUsuarios(chatId, term, 1);
        return { ok: true };
      }

      if (text.startsWith('/bloquear_usuario') || text.startsWith('/desbloquear_usuario') || text.startsWith('/eliminar_usuario') || text.startsWith('/rol_usuario') || text.startsWith('/saldo') || text.startsWith('/recargar_saldo') || text.startsWith('/editar_usuario')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.procesarComandosUsuarioAdmin(chatId, text, authUser);
        return { ok: true };
      }

      if (text.startsWith('/stock') || text === '⚠️ Stock') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.actualizarStockDesdeTelegram(chatId, text, authUser);
        return { ok: true };
      }

      if (text.startsWith('/precio')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.actualizarPrecioDesdeTelegram(chatId, text, authUser);
        return { ok: true };
      }

      if (text.startsWith('/cliente') || text.startsWith('/buscar')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.buscarFichaCliente(chatId, text, authUser);
        return { ok: true };
      }

      if (text.startsWith('/difusion') || text.startsWith('/anuncio') || text.startsWith('/broadcast')) {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.enviarDifusionMasiva(chatId, text, authUser);
        return { ok: true };
      }

      if (text === '/reporte_soporte' || text === '/soporte_stats') {
        if (!isAdminOrAdvisor && chatId !== String(this.adminChatId)) {
          await this.sendMessage(chatId, '🔒 Requiere permisos de Administrador.');
          return { ok: true };
        }
        await this.mostrarReporteSoporte(chatId);
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

      if (text === '/misproductos' || text === '🌾 Mis Productos') {
        await this.mostrarProductosCampesino(chatId, authUser);
        return { ok: true };
      }

      if (text === '/misventas' || text === '💰 Mis Ventas') {
        await this.mostrarVentasCampesino(chatId, authUser);
        return { ok: true };
      }

      if (text === '/soporte' || text === '💬 Soporte' || text === '/ayuda') {
        await this.iniciarFlujoSoporte(chatId, authUser, session);
        return { ok: true };
      }

      if (text === '🆔 Mi ID' || text === '/id') {
        await this.sendMessage(chatId, `🆔 <b>Tu Chat ID de Telegram:</b> <code>${chatId}</code>\n${authUser ? `👤 <b>Usuario:</b> ${authUser.nombre || authUser.username} (${authUser.rolNombre || 'Registrado'})` : '🔒 No has iniciado sesión (/login)'}`);
        return { ok: true };
      }

      if (text === '🛒 Ver Catálogo' || text === '🌾 Catálogo' || text === '/catalogo') {
        const kb = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Abrir Catálogo Web', url: 'https://delosmontesdemaria.onrender.com/catalogo' }]
            ]
          }
        };
        await this.sendMessage(chatId, '🌾 <b>Catálogo de Cosechas - De los Montes de María</b>\n\nExplora productos frescos directo del campo a tu hogar:', kb);
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
          // Reenviar el mensaje a los asesores/administradores para conversación fluida y directa
          this.notificarMensajeCliente({
            ticket: currentTicket,
            mensaje: text,
            nombreRemitente: session.data.nombre || userName,
            excludeChatId: chatId
          }).catch(() => {});
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
      const expiresAt = Date.now() + 10 * 60 * 1000;

      await this.guardarCodigoOTPPendiente(chatId, user, otpCode, expiresAt);

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

<i>📁 Revisa en tu bandeja de entrada o en la carpeta de <b>Spam / Correo no deseado</b>.</i>
<i>💡 También puedes ingresar directamente escribiendo tu contraseña de la web.</i>
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
    const pending = await this.obtenerCodigoOTPPendiente(chatId);

    if (!pending || !pending.userObj) {
      await this.sendMessage(chatId, '⚠️ No tienes una solicitud activa de inicio de sesión. Escribe <b>/login</b> para comenzar.');
      return;
    }

    const user = pending.userObj;
    const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await this.guardarCodigoOTPPendiente(chatId, user, newOtpCode, expiresAt);

    let session = this.sessions.get(chatId);
    if (!session) {
      session = { state: 'LOGIN_WAIT_AUTH', data: { authUser: user }, activeTicket: null, activeSessionId: null };
      this.sessions.set(chatId, session);
    } else {
      session.state = 'LOGIN_WAIT_AUTH';
      session.data = { authUser: user };
    }

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
<i>(Revisa en tu bandeja de entrada o en la carpeta de Spam / Correo no deseado)</i>
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
          const prods = typeof this.productoRepository.listarTodos === 'function'
            ? await this.productoRepository.listarTodos()
            : await this.productoRepository.buscarTodos();
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
        await this.sendMessage(chatId, '✅ <b>No hay tickets pendientes.</b>\nTodos los casos de soporte han sido atendidos o resueltos.');
        return;
      }

      let msg = `🎫 <b>TICKETS DE SOPORTE EN ESPERA (${pendientes.length})</b> 🌾\n━━━━━━━━━━━━━━━━━━\n`;
      const keyboard = [];

      pendientes.forEach((t) => {
        const codigo = t.ticket_code || `TK-${t.id}`;
        const asunto = escapeHtml(t.asunto || t.categoria || 'Consulta');
        const cliente = escapeHtml(t.nombre_cliente || t.correo_cliente || 'Cliente');
        const estadoEmoji = t.estado === 'abierto' ? '🔴' : t.estado === 'en_atencion' ? '🟡' : '🟢';
        const snippet = escapeHtml((t.ultimo_mensaje || t.descripcion || 'Sin mensaje adicional').slice(0, 45));

        msg += `${estadoEmoji} <b>#${codigo}</b> - <i>${cliente}</i>\n   📝 <b>${asunto}</b>\n   💬 "${snippet}..."\n\n`;

        keyboard.push([
          { text: `💬 Responder #${codigo}`, callback_data: `reply_tk:${codigo}` },
          { text: `🔒 Cerrar`, callback_data: `close_tk:${codigo}` }
        ]);
      });

      msg += `━━━━━━━━━━━━━━━━━━\n💡 <i>Toca 'Responder' o responde citando el mensaje.</i>`;

      keyboard.push([
        { text: '🔄 Refrescar Tickets', callback_data: 'cmd_tickets' },
        { text: '📊 Resumen General', callback_data: 'cmd_resumen' }
      ]);

      await this.sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } });
    } catch (err) {
      console.error('[Telegram mostrarTicketsPendientes Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al consultar tickets: ${err.message}`);
    }
  }

  async cambiarEstadoPedidoDesdeTelegram(chatId, idCompra, nuevoEstado, authUser) {
    if (!this.compraRepository) return;
    try {
      const id = String(idCompra).replace(/\D/g, '');
      const compra = await this.compraRepository.obtenerReciboCompleto(id);
      if (!compra) {
        await this.sendMessage(chatId, `❌ No se encontró la orden <code>#ORD-${id}</code>.`);
        return;
      }

      await this.compraRepository.actualizarEstado(id, nuevoEstado);

      // Reembolso de créditos si aplica
      if ((nuevoEstado === 'reembolsado' || nuevoEstado === 'Reembolso procesado') && !compra.reembolsado) {
        if (this.usuarioRepository) {
          await this.usuarioRepository.actualizarCreditos(compra.id_usuario, (parseFloat(compra.total) || 0));
        }
        await this.compraRepository.marcarReembolsado(id);
      }

      // Enviar correo electrónico enriquecido con stepper al comprador
      if (this.emailService && compra.correo_cliente) {
        this.emailService.sendOrderStatusEmail(compra, compra.correo_cliente, nuevoEstado).catch((e) => {
          console.warn('[Telegram Status Email Warning]:', e.message);
        });
      }

      const stateEmoji =
        nuevoEstado === 'en_camino' || nuevoEstado === 'despachado' ? '🚚' :
        nuevoEstado === 'entregado' ? '✅' :
        nuevoEstado === 'en_reparto' ? '🛵' :
        nuevoEstado === 'empaquetado' ? '📦' :
        nuevoEstado === 'confirmado' || nuevoEstado === 'en_preparacion' ? '👨‍🌾' : '⏳';

      const stateName = String(nuevoEstado).toUpperCase();
      await this.sendMessage(
        chatId,
        `✅ <b>¡Orden #ORD-${id} Actualizada con Éxito!</b>\n━━━━━━━━━━━━━━━━━━\n${stateEmoji} Nuevo Estado: <b>${stateName}</b>\n📧 Se envió el correo de notificación con barra de progreso a <code>${compra.correo_cliente || 'cliente'}</code>.`
      );
    } catch (err) {
      console.error('[Telegram cambiarEstadoPedido Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al actualizar pedido: ${err.message}`);
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

      await this.sendMessage(chatId, `🛒 <b>GESTIÓN DE PEDIDOS Y DESPACHOS (${ultimas.length} recientes)</b>\n━━━━━━━━━━━━━━━━━━\n<i>Toca los botones interactivos debajo de cada orden para actualizar su estado y notificar al cliente por correo al instante:</i>`);

      for (const c of ultimas) {
        const id = c.id_compra || c.id;
        const total = Number(c.total || 0).toLocaleString('es-CO');
        const estado = (c.estado || 'pendiente').toLowerCase();
        const clienteNombre = c.cliente_nombre || c.nombre_cliente || c.nombre || 'Cliente';
        const clienteTelefono = c.cliente_telefono || c.telefono || '';
        const direccion = c.direccion_envio || c.direccion || 'Montes de María';

        const stateEmoji =
          estado.includes('entreg') ? '✅' :
          estado.includes('repart') || estado.includes('local') ? '🛵' :
          estado.includes('camino') || estado.includes('despach') ? '🚚' :
          estado.includes('empa') || estado.includes('listo') ? '📦' :
          estado.includes('confirm') || estado.includes('prepar') ? '👨‍🌾' :
          estado.includes('cancel') ? '❌' : '⏳';

        const cleanPhone = String(clienteTelefono).replace(/\D/g, '');
        const hasPhone = cleanPhone.length >= 7;

        const orderText = `
🧾 <b>ORDEN #ORD-${id}</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Cliente:</b> ${clienteNombre}
📞 <b>Teléfono:</b> <code>${clienteTelefono || 'No registrado'}</code>
📍 <b>Entrega:</b> ${direccion}
💰 <b>Total:</b> <b>$${total} COP</b>
💳 <b>Pago:</b> ${c.metodo_pago || 'Contra Entrega'}
${stateEmoji} <b>Estado Actual:</b> <code>${estado.toUpperCase()}</code>
`;
        const buttons = [
          [
            { text: '👨‍🌾 En Finca', callback_data: `set_status:${id}:confirmado` },
            { text: '📦 Empacado', callback_data: `set_status:${id}:empaquetado` },
            { text: '🚚 En Camino', callback_data: `set_status:${id}:en_camino` }
          ],
          [
            { text: '🛵 En Reparto', callback_data: `set_status:${id}:en_reparto` },
            { text: '✅ Entregado', callback_data: `set_status:${id}:entregado` },
            { text: '❌ Cancelar', callback_data: `set_status:${id}:cancelado` }
          ]
        ];

        if (hasPhone) {
          const waUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(`Hola ${clienteNombre}, te contactamos de De los Montes de María sobre tu pedido #ORD-${id}.`)}`;
          buttons.push([
            { text: '💬 Abrir WhatsApp con el Cliente', url: waUrl }
          ]);
        }

        await this.sendMessage(chatId, orderText, {
          reply_markup: { inline_keyboard: buttons }
        });
      }
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al listar ventas: ${err.message}`);
    }
  }

  async mostrarMetricasNegocio(chatId) {
    try {
      const db = require('../persistence/Database');

      // 1. Métricas de recaudación (Hoy, 7 días, Mes)
      const revenueQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN DATE(fecha) = CURDATE() THEN total ELSE 0 END), 0) AS total_hoy,
          COALESCE(SUM(CASE WHEN fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN total ELSE 0 END), 0) AS total_semana,
          COALESCE(SUM(CASE WHEN MONTH(fecha) = MONTH(CURRENT_DATE()) AND YEAR(fecha) = YEAR(CURRENT_DATE()) THEN total ELSE 0 END), 0) AS total_mes,
          COALESCE(SUM(total), 0) AS total_historico,
          COUNT(*) AS total_pedidos,
          COALESCE(SUM(CASE WHEN estado IN ('entregado', 'Entregado') THEN 1 ELSE 0 END), 0) AS pedidos_entregados,
          COALESCE(SUM(CASE WHEN estado IN ('en_camino', 'despachado', 'en_reparto') THEN 1 ELSE 0 END), 0) AS pedidos_en_camino,
          COALESCE(SUM(CASE WHEN estado IN ('pendiente', 'confirmado', 'empaquetado', 'en_preparacion') THEN 1 ELSE 0 END), 0) AS pedidos_pendientes,
          COALESCE(SUM(CASE WHEN estado IN ('cancelado', 'reembolsado') THEN 1 ELSE 0 END), 0) AS pedidos_cancelados
        FROM compras
      `;

      const revData = await new Promise((res) => {
        db.query(revenueQuery, (err, r) => res(r && r[0] ? r[0] : {}));
      });

      // 2. Top 5 productos más vendidos
      const topProductsQuery = `
        SELECT p.nombre_producto, SUM(cd.cantidad) AS total_vendido, SUM(cd.cantidad * cd.precio_unitario) AS total_recaudado
        FROM compra_detalles cd
        JOIN productos p ON cd.id_producto = p.id_producto
        GROUP BY cd.id_producto, p.nombre_producto
        ORDER BY total_vendido DESC
        LIMIT 5
      `;
      const topProducts = await new Promise((res) => {
        db.query(topProductsQuery, (err, r) => res(r || []));
      });

      // 3. Usuarios registrados (compradores vs vendedores)
      const usersQuery = `
        SELECT 
          COUNT(*) AS total_usuarios,
          COALESCE(SUM(CASE WHEN id_rol = 2 THEN 1 ELSE 0 END), 0) AS total_campesinos,
          COALESCE(SUM(CASE WHEN id_rol = 3 THEN 1 ELSE 0 END), 0) AS total_compradores,
          COALESCE(SUM(CASE WHEN id_rol = 1 THEN 1 ELSE 0 END), 0) AS total_admins
        FROM usuarios
      `;
      const usersData = await new Promise((res) => {
        db.query(usersQuery, (err, r) => res(r && r[0] ? r[0] : {}));
      });

      let topList = '';
      if (topProducts.length > 0) {
        topProducts.forEach((p, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '▫️';
          topList += `${medal} <b>${p.nombre_producto}</b>: <code>${p.total_vendido} uds</code> ($${Number(p.total_recaudado || 0).toLocaleString('es-CO')})\n`;
        });
      } else {
        topList = '  ▫️ Sin datos de ventas registrados aún.\n';
      }

      const msg = `
📊 <b>REPORTE EJECUTIVO & FINANCIERO</b> 🌾
━━━━━━━━━━━━━━━━━━
💰 <b>RECAUDACIÓN DE VENTAS:</b>
▫️ <b>Hoy:</b> <b>$${Number(revData.total_hoy || 0).toLocaleString('es-CO')} COP</b>
▫️ <b>Últimos 7 días:</b> $${Number(revData.total_semana || 0).toLocaleString('es-CO')} COP
▫️ <b>Mes actual:</b> $${Number(revData.total_mes || 0).toLocaleString('es-CO')} COP
▫️ <b>Total Histórico:</b> $${Number(revData.total_historico || 0).toLocaleString('es-CO')} COP

📦 <b>BALANCE DE PEDIDOS (${revData.total_pedidos || 0} totales):</b>
⏳ <b>Pendientes / En Finca:</b> ${revData.pedidos_pendientes || 0}
🚚 <b>En Ruta / Reparto:</b> ${revData.pedidos_en_camino || 0}
✅ <b>Entregados:</b> ${revData.pedidos_entregados || 0}
❌ <b>Cancelados:</b> ${revData.pedidos_cancelados || 0}

🥇 <b>TOP COSECHAS MÁS VENDIDAS:</b>
${topList}
👥 <b>COMUNIDAD REGISTRADA:</b>
👨‍🌾 <b>Campesinos Productores:</b> ${usersData.total_campesinos || 0}
🛒 <b>Clientes Compradores:</b> ${usersData.total_compradores || 0}
━━━━━━━━━━━━━━━━━━
`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🛒 Ver Pedidos Activos', callback_data: 'cmd_ventas' },
              { text: '🎫 Ver Tickets', callback_data: 'cmd_tickets' }
            ],
            [
              { text: '⚠️ Ver Stock Bajo', callback_data: 'cmd_stock' },
              { text: '🌐 Panel Web', url: 'https://delosmontesdemaria.onrender.com/admin' }
            ]
          ]
        }
      };

      await this.sendMessage(chatId, msg, keyboard);
    } catch (err) {
      console.error('[Telegram mostrarMetricasNegocio Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al generar métricas: ${err.message}`);
    }
  }

  async crearCuponDesdeTelegram(chatId, text, authUser) {
    try {
      const cleanArgs = text.replace(/^\/(cupon|crearcupon)\s*/i, '').trim();
      const parts = cleanArgs.split(/\s+/);
      if (parts.length < 2) {
        const helpMsg = `
🎟️ <b>CREAR CUPÓN DE DESCUENTO</b>
━━━━━━━━━━━━━━━━━━
<b>Uso:</b>
<code>/cupon [CODIGO] [PORCENTAJE] [MONTO_MINIMO_OPCIONAL]</code>

<b>Ejemplos:</b>
▫️ <code>/cupon FINCA15 15</code> (15% de descuento sin mínimo)
▫️ <code>/cupon MONTES20 20 50000</code> (20% de descuento en compras desde $50.000 COP)
`;
        await this.sendMessage(chatId, helpMsg);
        return;
      }

      const codigo = parts[0].toUpperCase().trim();
      const porcentaje = parseFloat(parts[1]) || 0;
      const minimo = parseFloat(parts[2]) || 0;

      if (porcentaje <= 0 || porcentaje > 100) {
        await this.sendMessage(chatId, '❌ El porcentaje de descuento debe estar entre 1 y 100.');
        return;
      }

      const db = require('../persistence/Database');
      const sql = `
        INSERT INTO cupones (codigo, descripcion, descuento_porcentaje, descuento_fijo, monto_minimo, uso_limite, activo)
        VALUES (?, ?, ?, 0, ?, 100, 1)
        ON DUPLICATE KEY UPDATE descuento_porcentaje = VALUES(descuento_porcentaje), monto_minimo = VALUES(monto_minimo), activo = 1
      `;
      const desc = `Cupón del ${porcentaje}% creado desde Telegram`;
      await new Promise((resolve, reject) => {
        db.query(sql, [codigo, desc, porcentaje, minimo], (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });

      const confirmMsg = `
🎉 <b>¡CUPÓN CREADO Y ACTIVADO CON ÉXITO!</b> 🎟️
━━━━━━━━━━━━━━━━━━
🏷️ <b>Código:</b> <code>${codigo}</code>
📉 <b>Descuento:</b> <b>${porcentaje}% OFF</b>
💵 <b>Monto Mínimo:</b> $${minimo.toLocaleString('es-CO')} COP
✅ <b>Estado:</b> Activo inmediatamente en la tienda web
━━━━━━━━━━━━━━━━━━
🌐 Los clientes ya pueden canjear <code>${codigo}</code> en la pantalla de compra.
`;
      await this.sendMessage(chatId, confirmMsg);
    } catch (err) {
      console.error('[Telegram crearCupon Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al crear cupón: ${err.message}`);
    }
  }

  // ── GESTIÓN INTEGRAL DE PRODUCTOS Y PRECIOS DESDE TELEGRAM ──
  async mostrarMenuGestionProductos(chatId, searchTerm = '', page = 1, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const limit = 6;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const offset = (pageNum - 1) * limit;

      let countSql = 'SELECT COUNT(*) AS total FROM productos';
      let sql = 'SELECT * FROM productos';
      let countParams = [];
      let params = [];

      if (searchTerm && searchTerm.trim()) {
        const filter = `%${searchTerm.trim()}%`;
        countSql += ' WHERE nombre_producto LIKE ? OR descripcion LIKE ?';
        countParams = [filter, filter];
        sql += ' WHERE nombre_producto LIKE ? OR descripcion LIKE ?';
        params = [filter, filter];
      }

      sql += ` ORDER BY id_producto DESC LIMIT ${limit} OFFSET ${offset}`;

      const countResult = await new Promise((res) => db.query(countSql, countParams, (err, r) => res(r && r[0] ? r[0].total : 0)));
      const totalCount = parseInt(countResult, 10) || 0;
      const totalPages = Math.ceil(totalCount / limit) || 1;

      const prods = await new Promise((res) => db.query(sql, params, (err, r) => res(r || [])));

      if (prods.length === 0) {
        const noMsg = `📦 <b>Gestión de Catálogo</b>\n━━━━━━━━━━━━━━━━━━\nNo se encontraron productos que coincidan con <code>${escapeHtml(searchTerm)}</code>.\n\n💡 <i>Escribe <code>/productos</code> para ver todos o <code>/precio [id] [valor]</code> para editar directamente.</i>`;
        if (messageIdToEdit) {
          const editRes = await this.editMessageText(chatId, messageIdToEdit, noMsg);
          if (editRes && !editRes.ok) await this.sendMessage(chatId, noMsg);
        } else {
          await this.sendMessage(chatId, noMsg);
        }
        return;
      }

      let msg = `📦 <b>GESTIÓN DE PRODUCTOS & PRECIOS</b> 🌾\n`;
      msg += `📄 <i>Página ${pageNum} de ${totalPages} (${totalCount} productos en total)</i>\n━━━━━━━━━━━━━━━━━━\n`;
      if (searchTerm) msg += `🔍 <i>Filtro: "${escapeHtml(searchTerm)}"</i>\n\n`;

      const keyboard = [];

      prods.forEach((p) => {
        const id = p.id_producto || p.id;
        const nombre = escapeHtml(p.nombre_producto || p.nombre || 'Producto');
        const precio = Number(p.precio || 0).toLocaleString('es-CO');
        const stock = Number(p.stock || 0);
        const isActivo = p.activo === 1 || p.activo === true || p.activo === undefined;
        const estadoEmoji = isActivo ? (stock > 5 ? '🟢' : stock > 0 ? '🟡' : '🔴') : '⏸️';
        const estadoTexto = isActivo ? (stock > 0 ? `${stock} unid.` : 'AGOTADO') : 'PAUSADO';

        msg += `${estadoEmoji} <b>#${id} ${nombre}</b>\n   💵 <b>$${precio} COP</b> | 📦 <b>${estadoTexto}</b>\n\n`;

        keyboard.push([
          { text: `🔍 #${id} ${(p.nombre_producto || p.nombre || 'Producto').slice(0, 14)}`, callback_data: `prod_view:${id}` },
          { text: isActivo ? '⏸️ Pausar' : '▶️ Activar', callback_data: `prod_toggle:${id}` },
          { text: '📦 +10', callback_data: `prod_stock_add:${id}:10` }
        ]);
      });

      msg += `━━━━━━━━━━━━━━━━━━\n💡 <i>Toca un producto para ajustar su precio o stock en 1 toque.</i>`;

      // Botones de paginación
      const navRow = [];
      const cleanTerm = searchTerm ? searchTerm.trim() : '';
      if (pageNum > 1) {
        navRow.push({ text: '◀️ Anterior', callback_data: `prod_page:${pageNum - 1}:${cleanTerm}` });
      }
      navRow.push({ text: `📄 ${pageNum}/${totalPages}`, callback_data: 'noop' });
      if (pageNum < totalPages) {
        navRow.push({ text: 'Siguiente ▶️', callback_data: `prod_page:${pageNum + 1}:${cleanTerm}` });
      }
      keyboard.push(navRow);

      keyboard.push([
        { text: '⚠️ Ver Solo Stock Bajo', callback_data: 'cmd_stock' },
        { text: '🔄 Refrescar', callback_data: `prod_page:${pageNum}:${cleanTerm}` }
      ]);

      if (messageIdToEdit) {
        const editRes = await this.editMessageText(chatId, messageIdToEdit, msg, { reply_markup: { inline_keyboard: keyboard } });
        if (editRes && !editRes.ok) {
          await this.sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } });
        }
      } else {
        await this.sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (err) {
      console.error('[Telegram mostrarMenuGestionProductos Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al consultar catálogo: ${err.message}`);
    }
  }

  async mostrarTarjetaProducto(chatId, productId, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const pId = parseInt(productId, 10);
      const rows = await new Promise((res) => db.query('SELECT * FROM productos WHERE id_producto = ?', [pId], (err, r) => res(r || [])));
      const p = rows[0];

      if (!p) {
        await this.sendMessage(chatId, `❌ No se encontró el producto <code>#${productId}</code>.`);
        return;
      }

      const id = p.id_producto || p.id;
      const nombre = p.nombre_producto || p.nombre;
      const precio = Number(p.precio || 0);
      const stock = Number(p.stock || 0);
      const isActivo = p.activo === 1 || p.activo === true || p.activo === undefined;

      const cardMsg = `
🌱 <b>FICHA DE GESTIÓN DE PRODUCTO</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>#${id}</code>
🌾 <b>Nombre:</b> <b>${nombre}</b>
💵 <b>Precio Actual:</b> <b>$${precio.toLocaleString('es-CO')} COP</b>
📦 <b>Inventario / Stock:</b> <b>${stock} unidades</b>
🚦 <b>Estado en Tienda Web:</b> ${isActivo ? '🟢 <b>ACTIVO & VISIBLE</b>' : '⏸️ <b>PAUSADO / OCULTO</b>'}
━━━━━━━━━━━━━━━━━━
⚡ <b>Acciones Rápidas en 1-Toque:</b>
`;

      const keyboard = [
        [
          { text: isActivo ? '⏸️ Pausar en Tienda Web' : '▶️ Activar en Tienda Web', callback_data: `prod_toggle:${id}` }
        ],
        [
          { text: '📦 +10 Stock', callback_data: `prod_stock_add:${id}:10` },
          { text: '📦 +50 Stock', callback_data: `prod_stock_add:${id}:50` },
          { text: '🔴 Agotar (0)', callback_data: `prod_stock_set:${id}:0` }
        ],
        [
          { text: `💲 $${(precio - 1000 > 0 ? precio - 1000 : precio).toLocaleString('es-CO')}`, callback_data: `prod_price_set:${id}:${precio - 1000 > 0 ? precio - 1000 : precio}` },
          { text: `💲 $${(precio + 1000).toLocaleString('es-CO')}`, callback_data: `prod_price_set:${id}:${precio + 1000}` },
          { text: `💲 $${(precio + 5000).toLocaleString('es-CO')}`, callback_data: `prod_price_set:${id}:${precio + 5000}` }
        ],
        [
          { text: '🔙 Volver al Catálogo', callback_data: 'cmd_productos' }
        ]
      ];

      if (messageIdToEdit) {
        await this.editMessageText(chatId, messageIdToEdit, cardMsg, { reply_markup: { inline_keyboard: keyboard } });
      } else {
        await this.sendMessage(chatId, cardMsg, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (err) {
      console.error('[Telegram mostrarTarjetaProducto Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  }

  async alternarEstadoProducto(chatId, productId, authUser, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const pId = parseInt(productId, 10);
      const rows = await new Promise((res) => db.query('SELECT activo, nombre_producto FROM productos WHERE id_producto = ?', [pId], (err, r) => res(r || [])));
      if (rows.length === 0) return;

      const currentActivo = rows[0].activo === 1 || rows[0].activo === true || rows[0].activo === undefined;
      const newActivo = currentActivo ? 0 : 1;

      await new Promise((res, rej) => {
        db.query('UPDATE productos SET activo = ? WHERE id_producto = ?', [newActivo, pId], (err, r) => err ? rej(err) : res(r));
      });

      await this.mostrarTarjetaProducto(chatId, pId, messageIdToEdit);
    } catch (err) {
      console.error('[Telegram alternarEstadoProducto Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al cambiar estado: ${err.message}`);
    }
  }

  async ajustarStockProducto(chatId, productId, deltaOrVal, isAbsolute = false, authUser = null, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const pId = parseInt(productId, 10);
      
      let sql = '';
      let params = [];

      if (isAbsolute) {
        const val = Math.max(0, parseInt(deltaOrVal, 10) || 0);
        sql = 'UPDATE productos SET stock = ? WHERE id_producto = ?';
        params = [val, pId];
      } else {
        const delta = parseInt(deltaOrVal, 10) || 0;
        sql = 'UPDATE productos SET stock = GREATEST(0, stock + ?) WHERE id_producto = ?';
        params = [delta, pId];
      }

      await new Promise((res, rej) => {
        db.query(sql, params, (err, r) => err ? rej(err) : res(r));
      });

      await this.mostrarTarjetaProducto(chatId, pId, messageIdToEdit);
    } catch (err) {
      console.error('[Telegram ajustarStockProducto Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al ajustar stock: ${err.message}`);
    }
  }

  async ajustarPrecioProducto(chatId, productId, newPrice, authUser = null, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const pId = parseInt(productId, 10);
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) return;

      await new Promise((res, rej) => {
        db.query('UPDATE productos SET precio = ? WHERE id_producto = ?', [price, pId], (err, r) => err ? rej(err) : res(r));
      });

      await this.mostrarTarjetaProducto(chatId, pId, messageIdToEdit);
    } catch (err) {
      console.error('[Telegram ajustarPrecioProducto Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al actualizar precio: ${err.message}`);
    }
  }

  async actualizarStockDesdeTelegram(chatId, text, authUser) {
    try {
      const cleanArgs = text.replace(/^\/stock\s*/i, '').trim();
      const parts = cleanArgs.split(/\s+/);
      if (parts.length < 2) {
        if (cleanArgs) {
          await this.mostrarMenuGestionProductos(chatId, cleanArgs, 1);
        } else {
          await this.mostrarStockCritico(chatId);
        }
        return;
      }

      const idOrName = parts[0].trim();
      const rawCantidad = parts[1].trim();

      const db = require('../persistence/Database');
      let findSql = !isNaN(idOrName)
        ? 'SELECT id_producto, nombre_producto, stock FROM productos WHERE id_producto = ?'
        : 'SELECT id_producto, nombre_producto, stock FROM productos WHERE nombre_producto LIKE ? LIMIT 1';
      let findParams = !isNaN(idOrName) ? [parseInt(idOrName, 10)] : [`%${idOrName}%`];

      const prods = await new Promise((res) => db.query(findSql, findParams, (err, r) => res(r || [])));
      if (prods.length === 0) {
        await this.sendMessage(chatId, `❌ No se encontró ningún producto que coincida con <b>${idOrName}</b>.`);
        return;
      }

      const p = prods[0];
      const isDelta = rawCantidad.startsWith('+') || rawCantidad.startsWith('-');
      const cantidadVal = parseInt(rawCantidad, 10);

      if (isNaN(cantidadVal)) {
        await this.sendMessage(chatId, '❌ La cantidad de stock debe ser un número válido (ej. <code>50</code>, <code>+20</code>, <code>-5</code>).');
        return;
      }

      await this.ajustarStockProducto(chatId, p.id_producto, cantidadVal, !isDelta, authUser);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al actualizar stock: ${err.message}`);
    }
  }

  async actualizarPrecioDesdeTelegram(chatId, text, authUser) {
    try {
      const cleanArgs = text.replace(/^\/precio\s*/i, '').trim();
      const parts = cleanArgs.split(/\s+/);
      if (parts.length < 2) {
        if (cleanArgs) {
          await this.mostrarMenuGestionProductos(chatId, cleanArgs, 1);
        } else {
          await this.sendMessage(chatId, '🏷️ <b>Uso:</b> <code>/precio [ID o Nombre] [NuevoPrecioCOP]</code>\n<i>Ejemplo: /precio aguacate 4500 o /precio 12 5000</i>');
        }
        return;
      }

      const idOrName = parts[0].trim();
      const precio = parseFloat(parts[1]);

      if (isNaN(precio) || precio <= 0) {
        await this.sendMessage(chatId, '❌ El precio debe ser un número positivo.');
        return;
      }

      const db = require('../persistence/Database');
      let findSql = !isNaN(idOrName)
        ? 'SELECT id_producto, nombre_producto, precio FROM productos WHERE id_producto = ?'
        : 'SELECT id_producto, nombre_producto, precio FROM productos WHERE nombre_producto LIKE ? LIMIT 1';
      let findParams = !isNaN(idOrName) ? [parseInt(idOrName, 10)] : [`%${idOrName}%`];

      const prods = await new Promise((res) => db.query(findSql, findParams, (err, r) => res(r || [])));
      if (prods.length === 0) {
        await this.sendMessage(chatId, `❌ No se encontró ningún producto que coincida con <b>${idOrName}</b>.`);
        return;
      }

      const p = prods[0];
      await this.ajustarPrecioProducto(chatId, p.id_producto, precio, authUser);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al actualizar precio: ${err.message}`);
    }
  }

  // ── GESTIÓN INTEGRAL DE USUARIOS DESDE TELEGRAM (BLOQUEAR, ELIMINAR, ROL, SALDO) ──
  async mostrarMenuGestionUsuarios(chatId, searchTerm = '', page = 1, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const limit = 6;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const offset = (pageNum - 1) * limit;

      let countSql = 'SELECT COUNT(*) AS total FROM usuarios';
      let sql = 'SELECT * FROM usuarios';
      let countParams = [];
      let params = [];

      if (searchTerm && searchTerm.trim()) {
        const filter = `%${searchTerm.trim()}%`;
        countSql += ' WHERE nombre LIKE ? OR apodo LIKE ? OR correo LIKE ? OR telefono LIKE ?';
        countParams = [filter, filter, filter, filter];
        sql += ' WHERE nombre LIKE ? OR apodo LIKE ? OR correo LIKE ? OR telefono LIKE ?';
        params = [filter, filter, filter, filter];
      }

      sql += ` ORDER BY id_usuario DESC LIMIT ${limit} OFFSET ${offset}`;

      const countResult = await new Promise((res) => db.query(countSql, countParams, (err, r) => res(r && r[0] ? r[0].total : 0)));
      const totalCount = parseInt(countResult, 10) || 0;
      const totalPages = Math.ceil(totalCount / limit) || 1;

      const users = await new Promise((res) => db.query(sql, params, (err, r) => res(r || [])));

      if (users.length === 0) {
        const noMsg = `👥 <b>Gestión de Usuarios</b>\n━━━━━━━━━━━━━━━━━━\nNo se encontraron usuarios con el término <code>${escapeHtml(searchTerm)}</code>.\n\n💡 <i>Escribe <code>/usuarios</code> para ver todos o <code>/usuario [correo]</code> para buscar directamente.</i>`;
        if (messageIdToEdit) {
          const editRes = await this.editMessageText(chatId, messageIdToEdit, noMsg);
          if (editRes && !editRes.ok) await this.sendMessage(chatId, noMsg);
        } else {
          await this.sendMessage(chatId, noMsg);
        }
        return;
      }

      let msg = `👥 <b>GESTIÓN Y CONTROL DE USUARIOS</b> 🛡️\n`;
      msg += `📄 <i>Página ${pageNum} de ${totalPages} (${totalCount} usuarios en total)</i>\n━━━━━━━━━━━━━━━━━━\n`;
      if (searchTerm) msg += `🔍 <i>Filtro: "${escapeHtml(searchTerm)}"</i>\n\n`;

      const keyboard = [];

      users.forEach((u) => {
        const id = u.id_usuario;
        const nombre = escapeHtml(u.nombre || u.apodo || 'Usuario');
        const correo = escapeHtml(u.correo || 'Sin correo');
        const rolTexto = u.id_rol === 1 ? '👑 Admin' : u.id_rol === 2 ? '🌾 Campesino' : '🛒 Comprador';
        const isActivo = u.activo === 1 || u.activo === true || u.activo === undefined;
        const estadoEmoji = isActivo ? '🟢' : '🔴';

        msg += `${estadoEmoji} <b>#${id} ${nombre}</b> (${rolTexto})\n   📧 <code>${correo}</code> | 💵 <b>$${Number(u.creditos || 0).toLocaleString('es-CO')}</b>\n\n`;

        keyboard.push([
          { text: `👤 #${id} ${(u.nombre || u.apodo || 'Usuario').slice(0, 14)}`, callback_data: `usr_view:${id}` },
          { text: isActivo ? '🚫 Bloquear' : '✅ Desbloquear', callback_data: `usr_toggle:${id}` },
          { text: '👑 Rol', callback_data: `usr_role_menu:${id}` }
        ]);
      });

      msg += `━━━━━━━━━━━━━━━━━━\n💡 <i>Toca un usuario para ver su ficha completa, recargar saldo o eliminarlo.</i>`;

      // Botones de paginación
      const navRow = [];
      const cleanTerm = searchTerm ? searchTerm.trim() : '';
      if (pageNum > 1) {
        navRow.push({ text: '◀️ Anterior', callback_data: `usr_page:${pageNum - 1}:${cleanTerm}` });
      }
      navRow.push({ text: `📄 ${pageNum}/${totalPages}`, callback_data: 'noop' });
      if (pageNum < totalPages) {
        navRow.push({ text: 'Siguiente ▶️', callback_data: `usr_page:${pageNum + 1}:${cleanTerm}` });
      }
      keyboard.push(navRow);

      keyboard.push([
        { text: '🔄 Refrescar Lista', callback_data: `usr_page:${pageNum}:${cleanTerm}` }
      ]);

      if (messageIdToEdit) {
        const editRes = await this.editMessageText(chatId, messageIdToEdit, msg, { reply_markup: { inline_keyboard: keyboard } });
        if (editRes && !editRes.ok) {
          await this.sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } });
        }
      } else {
        await this.sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (err) {
      console.error('[Telegram mostrarMenuGestionUsuarios Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al consultar usuarios: ${err.message}`);
    }
  }

  async mostrarTarjetaUsuario(chatId, userId, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const uId = parseInt(userId, 10);
      const users = await new Promise((res) => db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [uId], (err, r) => res(r || [])));
      const u = users[0];

      if (!u) {
        await this.sendMessage(chatId, `❌ No se encontró el usuario <code>#${userId}</code>.`);
        return;
      }

      const id = u.id_usuario;
      const nombre = u.nombre || u.apodo;
      const correo = u.correo;
      const tel = u.telefono || 'Sin registrar';
      const dir = u.direccion || 'Sin registrar';
      const rolTexto = u.id_rol === 1 ? '👑 Administrador' : u.id_rol === 2 ? '🌾 Vendedor Campesino' : '🛒 Comprador / Cliente';
      const isActivo = u.activo === 1 || u.activo === true || u.activo === undefined;
      const creditos = Number(u.creditos || 0).toLocaleString('es-CO');

      // Consultar compras
      const purchases = await new Promise((res) => db.query('SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_spent FROM compras WHERE id_usuario = ?', [id], (err, r) => res(r && r[0] ? r[0] : { total_orders: 0, total_spent: 0 })));

      const cleanPhone = String(tel).replace(/\D/g, '');
      const hasPhone = cleanPhone.length >= 7;

      const cardMsg = `
👤 <b>FICHA DE ADMINISTRACIÓN DE USUARIO</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>#${id}</code>
📛 <b>Nombre:</b> <b>${nombre}</b>
📧 <b>Correo:</b> <code>${correo}</code>
📞 <b>Teléfono:</b> <code>${tel}</code>
📍 <b>Dirección:</b> ${dir}
🏷️ <b>Rol en Plataforma:</b> <b>${rolTexto}</b>
🚦 <b>Estado de Cuenta:</b> ${isActivo ? '🟢 <b>ACTIVO & HABILITADO</b>' : '🔴 <b>BLOQUEADO / SUSPENDIDO</b>'}
💰 <b>Billetera / Saldo:</b> <b>$${creditos} COP</b>
🛍️ <b>Historial de Compras:</b> ${purchases.total_orders} órdenes ($${Number(purchases.total_spent).toLocaleString('es-CO')} COP)
━━━━━━━━━━━━━━━━━━
⚡ <b>Acciones de Administrador:</b>
`;

      const keyboard = [
        [
          { text: isActivo ? '🚫 Bloquear Acceso' : '✅ Desbloquear y Activar', callback_data: `usr_toggle:${id}` },
          { text: '👑 Cambiar Rol', callback_data: `usr_role_menu:${id}` }
        ],
        [
          { text: '💰 +$20K Saldo', callback_data: `usr_credit_add:${id}:20000` },
          { text: '💰 +$50K Saldo', callback_data: `usr_credit_add:${id}:50000` }
        ],
        [
          { text: '🗑️ Eliminar Usuario', callback_data: `usr_del_ask:${id}` }
        ]
      ];

      if (hasPhone) {
        keyboard.push([
          { text: '💬 Escribir por WhatsApp', url: `https://wa.me/57${cleanPhone}` }
        ]);
      }

      keyboard.push([
        { text: '🔙 Volver a Lista de Usuarios', callback_data: 'cmd_usuarios' }
      ]);

      if (messageIdToEdit) {
        await this.editMessageText(chatId, messageIdToEdit, cardMsg, { reply_markup: { inline_keyboard: keyboard } });
      } else {
        await this.sendMessage(chatId, cardMsg, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (err) {
      console.error('[Telegram mostrarTarjetaUsuario Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  }

  async alternarBloqueoUsuario(chatId, userId, authUser = null, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const uId = parseInt(userId, 10);
      const rows = await new Promise((res) => db.query('SELECT activo FROM usuarios WHERE id_usuario = ?', [uId], (err, r) => res(r || [])));
      if (rows.length === 0) return;

      const current = rows[0].activo === 1 || rows[0].activo === true || rows[0].activo === undefined;
      const next = current ? 0 : 1;

      await new Promise((res, rej) => {
        db.query('UPDATE usuarios SET activo = ? WHERE id_usuario = ?', [next, uId], (err, r) => err ? rej(err) : res(r));
      });

      await this.mostrarTarjetaUsuario(chatId, uId, messageIdToEdit);
    } catch (err) {
      console.error('[Telegram alternarBloqueoUsuario Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al bloquear/desbloquear: ${err.message}`);
    }
  }

  async preguntarEliminarUsuario(chatId, userId, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const uId = parseInt(userId, 10);
      const rows = await new Promise((res) => db.query('SELECT nombre, correo FROM usuarios WHERE id_usuario = ?', [uId], (err, r) => res(r || [])));
      const u = rows[0];

      const warnMsg = `
⚠️ <b>¿CONFIRMAS ELIMINAR ESTE USUARIO?</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> ${u?.nombre || '#' + uId}
📧 <b>Correo:</b> <code>${u?.correo || ''}</code>
━━━━━━━━━━━━━━━━━━
🚨 <b>ADVERTENCIA:</b> Esta acción borrará permanentemente la cuenta de usuario de la base de datos.
`;

      const keyboard = [
        [
          { text: '⚠️ Sí, Eliminar Definitivamente', callback_data: `usr_del_confirm:${uId}` }
        ],
        [
          { text: '❌ Cancelar y Volver', callback_data: `usr_view:${uId}` }
        ]
      ];

      if (messageIdToEdit) {
        await this.editMessageText(chatId, messageIdToEdit, warnMsg, { reply_markup: { inline_keyboard: keyboard } });
      } else {
        await this.sendMessage(chatId, warnMsg, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (err) {
      console.error('[Telegram preguntarEliminarUsuario Error]:', err);
    }
  }

  async eliminarUsuarioDesdeTelegram(chatId, userId, authUser = null, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const uId = parseInt(userId, 10);

      // Limpieza en cascada segura
      await new Promise((res) => db.query('DELETE FROM carrito WHERE id_usuario = ?', [uId], () => res()));
      await new Promise((res) => db.query('DELETE FROM soporte_mensajes WHERE id_usuario = ?', [uId], () => res()));
      await new Promise((res) => db.query('DELETE FROM soporte_tickets WHERE id_usuario = ?', [uId], () => res()));
      await new Promise((res, rej) => {
        db.query('DELETE FROM usuarios WHERE id_usuario = ?', [uId], (err, r) => err ? rej(err) : res(r));
      });

      const confirmMsg = `
🗑️ <b>¡USUARIO ELIMINADO CON ÉXITO!</b>
━━━━━━━━━━━━━━━━━━
El usuario <code>#${uId}</code> ha sido eliminado definitivamente de la base de datos.
`;
      const keyboard = [
        [{ text: '👥 Volver a la Lista de Usuarios', callback_data: 'cmd_usuarios' }]
      ];

      if (messageIdToEdit) {
        await this.editMessageText(chatId, messageIdToEdit, confirmMsg, { reply_markup: { inline_keyboard: keyboard } });
      } else {
        await this.sendMessage(chatId, confirmMsg, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (err) {
      console.error('[Telegram eliminarUsuario Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al eliminar usuario: ${err.message}`);
    }
  }

  async mostrarMenuCambiarRolUsuario(chatId, userId, messageIdToEdit = null) {
    try {
      const uId = parseInt(userId, 10);
      const msg = `
👑 <b>SELECCIONA EL NUEVO ROL</b>
━━━━━━━━━━━━━━━━━━
Elige el nivel de acceso que deseas asignar al usuario <code>#${uId}</code>:
`;
      const keyboard = [
        [{ text: '👑 1. Administrador Total', callback_data: `usr_role_set:${uId}:1` }],
        [{ text: '🌾 2. Vendedor Campesino', callback_data: `usr_role_set:${uId}:2` }],
        [{ text: '🛒 3. Comprador / Cliente', callback_data: `usr_role_set:${uId}:3` }],
        [{ text: '🔙 Cancelar', callback_data: `usr_view:${uId}` }]
      ];

      if (messageIdToEdit) {
        await this.editMessageText(chatId, messageIdToEdit, msg, { reply_markup: { inline_keyboard: keyboard } });
      } else {
        await this.sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (err) {
      console.error('[Telegram mostrarMenuCambiarRolUsuario Error]:', err);
    }
  }

  async cambiarRolUsuario(chatId, userId, newRoleId, authUser = null, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const uId = parseInt(userId, 10);
      const rId = parseInt(newRoleId, 10);

      await new Promise((res, rej) => {
        db.query('UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?', [rId, uId], (err, r) => err ? rej(err) : res(r));
      });

      await this.mostrarTarjetaUsuario(chatId, uId, messageIdToEdit);
    } catch (err) {
      console.error('[Telegram cambiarRolUsuario Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al cambiar rol: ${err.message}`);
    }
  }

  async ajustarSaldoUsuario(chatId, userId, amount, isDelta = false, authUser = null, messageIdToEdit = null) {
    try {
      const db = require('../persistence/Database');
      const uId = parseInt(userId, 10);
      const val = parseFloat(amount) || 0;

      let sql = isDelta
        ? 'UPDATE usuarios SET creditos = GREATEST(0, COALESCE(creditos, 0) + ?) WHERE id_usuario = ?'
        : 'UPDATE usuarios SET creditos = ? WHERE id_usuario = ?';

      await new Promise((res, rej) => {
        db.query(sql, [val, uId], (err, r) => err ? rej(err) : res(r));
      });

      await this.mostrarTarjetaUsuario(chatId, uId, messageIdToEdit);
    } catch (err) {
      console.error('[Telegram ajustarSaldoUsuario Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al ajustar saldo: ${err.message}`);
    }
  }

  async procesarComandosUsuarioAdmin(chatId, text, authUser) {
    try {
      const db = require('../persistence/Database');
      const parts = text.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const idOrEmail = parts[1]?.trim();

      if (!idOrEmail) {
        const helpMsg = `
👥 <b>COMANDOS DE GESTIÓN DE USUARIOS</b>
━━━━━━━━━━━━━━━━━━
▫️ <code>/usuario [id o correo]</code>: Ver ficha del usuario
▫️ <code>/bloquear_usuario [id o correo]</code>: Suspender cuenta
▫️ <code>/desbloquear_usuario [id o correo]</code>: Reactivar cuenta
▫️ <code>/eliminar_usuario [id o correo]</code>: Borrar cuenta permanentemente
▫️ <code>/rol_usuario [id o correo] [admin|campesino|comprador]</code>: Cambiar rol
▫️ <code>/saldo [id o correo] [monto]</code>: Recargar o asignar saldo
▫️ <code>/editar_usuario [id o correo] [nombre|telefono|correo] [nuevo_valor]</code>: Modificar dato
`;
        await this.sendMessage(chatId, helpMsg);
        return;
      }

      // Buscar usuario
      let findSql = !isNaN(idOrEmail)
        ? 'SELECT * FROM usuarios WHERE id_usuario = ?'
        : 'SELECT * FROM usuarios WHERE correo = ? OR apodo = ? OR nombre LIKE ? LIMIT 1';
      let findParams = !isNaN(idOrEmail) ? [parseInt(idOrEmail, 10)] : [idOrEmail, idOrEmail, `%${idOrEmail}%`];

      const users = await new Promise((res) => db.query(findSql, findParams, (err, r) => res(r || [])));
      if (users.length === 0) {
        await this.sendMessage(chatId, `❌ No se encontró ningún usuario que coincida con <b>${idOrEmail}</b>.`);
        return;
      }

      const u = users[0];

      if (cmd === '/bloquear_usuario') {
        await this.alternarBloqueoUsuario(chatId, u.id_usuario, authUser);
        return;
      }

      if (cmd === '/desbloquear_usuario') {
        await new Promise((res, rej) => {
          db.query('UPDATE usuarios SET activo = 1 WHERE id_usuario = ?', [u.id_usuario], (err, r) => err ? rej(err) : res(r));
        });
        await this.mostrarTarjetaUsuario(chatId, u.id_usuario);
        return;
      }

      if (cmd === '/eliminar_usuario') {
        await this.preguntarEliminarUsuario(chatId, u.id_usuario);
        return;
      }

      if (cmd === '/rol_usuario') {
        const targetRol = parts[2]?.toLowerCase();
        const roleMap = { 'admin': 1, 'administrador': 1, 'campesino': 2, 'vendedor': 2, 'comprador': 3, 'cliente': 3 };
        const newRoleId = roleMap[targetRol];
        if (!newRoleId) {
          await this.mostrarMenuCambiarRolUsuario(chatId, u.id_usuario);
          return;
        }
        await this.cambiarRolUsuario(chatId, u.id_usuario, newRoleId, authUser);
        return;
      }

      if (cmd === '/saldo' || cmd === '/recargar_saldo') {
        const rawAmount = parts[2]?.trim();
        if (!rawAmount) {
          await this.sendMessage(chatId, `💰 <b>Uso:</b> <code>/saldo ${u.id_usuario} [monto o +monto]</code>\n<i>Ejemplo: /saldo ${u.id_usuario} +25000</i>`);
          return;
        }
        const isDelta = rawAmount.startsWith('+') || rawAmount.startsWith('-');
        const amountVal = parseFloat(rawAmount);
        if (isNaN(amountVal)) {
          await this.sendMessage(chatId, '❌ El monto debe ser un número válido.');
          return;
        }
        await this.ajustarSaldoUsuario(chatId, u.id_usuario, amountVal, isDelta, authUser);
        return;
      }

      if (cmd === '/editar_usuario') {
        const field = parts[2]?.toLowerCase();
        const newVal = parts.slice(3).join(' ').trim();
        const allowedFields = { 'nombre': 'nombre', 'telefono': 'telefono', 'correo': 'correo', 'direccion': 'direccion' };
        const col = allowedFields[field];
        if (!col || !newVal) {
          await this.sendMessage(chatId, `✍️ <b>Uso:</b> <code>/editar_usuario ${u.id_usuario} [nombre|telefono|correo|direccion] [Nuevo Valor]</code>`);
          return;
        }
        await new Promise((res, rej) => {
          db.query(`UPDATE usuarios SET ${col} = ? WHERE id_usuario = ?`, [newVal, u.id_usuario], (err, r) => err ? rej(err) : res(r));
        });
        await this.mostrarTarjetaUsuario(chatId, u.id_usuario);
        return;
      }

      await this.mostrarTarjetaUsuario(chatId, u.id_usuario);
    } catch (err) {
      console.error('[Telegram procesarComandosUsuarioAdmin Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al procesar comando: ${err.message}`);
    }
  }

  async buscarFichaCliente(chatId, text, authUser) {
    try {
      const term = text.replace(/^\/(cliente|buscar)\s*/i, '').trim();
      if (!term) {
        await this.sendMessage(chatId, '🔍 <b>Uso:</b> <code>/cliente [correo, teléfono o nombre]</code>\n<i>Ejemplo: /cliente danilo</i>');
        return;
      }

      const db = require('../persistence/Database');
      const userSql = `
        SELECT * FROM usuarios 
        WHERE correo LIKE ? OR telefono LIKE ? OR nombre LIKE ? OR apodo LIKE ?
        LIMIT 1
      `;
      const likeTerm = `%${term}%`;
      const users = await new Promise((res) => db.query(userSql, [likeTerm, likeTerm, likeTerm, likeTerm], (err, r) => res(r || [])));

      if (users.length === 0) {
        await this.sendMessage(chatId, `❌ No se encontró ningún cliente registrado con el término <b>${term}</b>.`);
        return;
      }

      const u = users[0];
      const uId = u.id_usuario;

      // Consultar historial de compras
      const ordersSql = `SELECT id_compra, total, estado, fecha, direccion_envio FROM compras WHERE id_usuario = ? ORDER BY fecha DESC LIMIT 5`;
      const orders = await new Promise((res) => db.query(ordersSql, [uId], (err, r) => res(r || [])));

      // Consultar tickets de soporte
      const ticketsSql = `SELECT ticket_code, asunto, estado, created_at FROM soporte_tickets WHERE correo_cliente = ? OR id_usuario = ? ORDER BY created_at DESC LIMIT 3`;
      const tickets = await new Promise((res) => db.query(ticketsSql, [u.correo, uId], (err, r) => res(r || [])));

      const totalGastado = orders.reduce((acc, o) => acc + parseFloat(o.total || 0), 0);
      const rolTexto = u.id_rol === 1 ? '👑 Admin' : u.id_rol === 2 ? '🌾 Campesino' : '🛒 Comprador';

      let ordersList = '';
      if (orders.length > 0) {
        orders.forEach((o) => {
          ordersList += `  ▫️ <b>#ORD-${o.id_compra}</b> | $${Number(o.total || 0).toLocaleString('es-CO')} | <code>${(o.estado || 'pendiente').toUpperCase()}</code>\n`;
        });
      } else {
        ordersList = '  ▫️ Sin pedidos registrados aún.\n';
      }

      let ticketsList = '';
      if (tickets.length > 0) {
        tickets.forEach((t) => {
          ticketsList += `  ▫️ <code>#${t.ticket_code}</code> | ${t.asunto} (<i>${t.estado}</i>)\n`;
        });
      } else {
        ticketsList = '  ▫️ Sin tickets de soporte.\n';
      }

      const cleanPhone = String(u.telefono || '').replace(/\D/g, '');
      const hasPhone = cleanPhone.length >= 7;

      const profileMsg = `
👤 <b>FICHA DEL CLIENTE #${uId}</b>
━━━━━━━━━━━━━━━━━━
📛 <b>Nombre:</b> ${u.nombre || u.apodo}
📧 <b>Correo:</b> <code>${u.correo}</code>
📞 <b>Teléfono:</b> <code>${u.telefono || 'Sin registrar'}</code>
🏷️ <b>Rol:</b> ${rolTexto}
📍 <b>Dirección:</b> ${u.direccion || 'No registrada'}
💰 <b>Total Histórico Comprado:</b> <b>$${totalGastado.toLocaleString('es-CO')} COP</b>

📦 <b>Últimos Pedidos (${orders.length}):</b>
${ordersList}
🎫 <b>Historial de Soporte (${tickets.length}):</b>
${ticketsList}
━━━━━━━━━━━━━━━━━━
`;

      const buttons = [];
      if (hasPhone) {
        buttons.push([
          { text: '💬 Contactar por WhatsApp', url: `https://wa.me/57${cleanPhone}` }
        ]);
      }

      await this.sendMessage(chatId, profileMsg, {
        reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined
      });
    } catch (err) {
      console.error('[Telegram buscarFichaCliente Error]:', err);
      await this.sendMessage(chatId, `⚠️ Error al consultar cliente: ${err.message}`);
    }
  }

  async enviarDifusionMasiva(chatId, text, authUser) {
    try {
      const broadcastMsg = text.replace(/^\/(difusion|anuncio|broadcast)\s*/i, '').trim();
      if (!broadcastMsg) {
        await this.sendMessage(chatId, '📢 <b>Uso:</b> <code>/difusion [Mensaje del Comunicado]</code>\n<i>Ejemplo: /difusion 🌾 ¡Gran cosecha de aguacate esta semana con 15% de descuento!</i>');
        return;
      }

      const formatted = `
📢 <b>COMUNICADO OFICIAL</b> 🌾
<b>De los Montes de María</b>
━━━━━━━━━━━━━━━━━━
${broadcastMsg}
━━━━━━━━━━━━━━━━━━
🌿 <i>Del campo colombiano directo a tu mesa</i>
`;

      let sentCount = 0;
      for (const subscriberId of this.subscribers) {
        try {
          await this.sendMessage(subscriberId, formatted);
          sentCount++;
        } catch (_) {}
      }

      await this.sendMessage(chatId, `✅ <b>Difusión completada:</b> Mensaje enviado a <code>${sentCount}</code> suscriptores de Telegram.`);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error en difusión: ${err.message}`);
    }
  }

  async mostrarReporteSoporte(chatId) {
    try {
      const db = require('../persistence/Database');
      const statsQuery = `
        SELECT 
          COUNT(*) AS total_tickets,
          COALESCE(SUM(CASE WHEN estado = 'cerrado' THEN 1 ELSE 0 END), 0) AS cerrados,
          COALESCE(SUM(CASE WHEN estado = 'agente' THEN 1 ELSE 0 END), 0) AS en_agente,
          COALESCE(SUM(CASE WHEN estado = 'bot' THEN 1 ELSE 0 END), 0) AS resueltos_ia,
          COALESCE(SUM(CASE WHEN asunto LIKE '%pedido%' OR asunto LIKE '%envio%' THEN 1 ELSE 0 END), 0) AS tema_envios,
          COALESCE(SUM(CASE WHEN asunto LIKE '%pago%' OR asunto LIKE '%factura%' THEN 1 ELSE 0 END), 0) AS tema_pagos,
          COALESCE(SUM(CASE WHEN asunto LIKE '%producto%' OR asunto LIKE '%cosecha%' THEN 1 ELSE 0 END), 0) AS tema_productos
        FROM soporte_tickets
      `;

      const stats = await new Promise((res) => db.query(statsQuery, (err, r) => res(r && r[0] ? r[0] : {})));

      const msg = `
📊 <b>REPORTE DE SOPORTE & ATENCIÓN AL CLIENTE</b>
━━━━━━━━━━━━━━━━━━
🎫 <b>Total de Tickets Recibidos:</b> <code>${stats.total_tickets || 0}</code>
✅ <b>Tickets Resueltos & Cerrados:</b> ${stats.cerrados || 0}
👨‍🌾 <b>Atendidos por Agentes Humanos:</b> ${stats.en_agente || 0}
🤖 <b>Atendidos Directamente por IA:</b> ${stats.resueltos_ia || 0}

🏷️ <b>TEMAS MÁS FRECUENTES:</b>
📦 <b>Envíos y Despachos:</b> ${stats.tema_envios || 0} consultas
🌱 <b>Productos y Frescura:</b> ${stats.tema_productos || 0} consultas
💳 <b>Pagos y Facturas:</b> ${stats.tema_pagos || 0} consultas
━━━━━━━━━━━━━━━━━━
`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎫 Ver Tickets Pendientes', callback_data: 'cmd_tickets' }],
            [{ text: '🌐 Panel Web de Soporte', url: 'https://delosmontesdemaria.onrender.com/admin/soporte' }]
          ]
        }
      };

      await this.sendMessage(chatId, msg, keyboard);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al generar reporte de soporte: ${err.message}`);
    }
  }

  async enviarMacroRespuesta(chatId, ticketCode, macroType, authUser) {
    const macros = {
      envios: '🚚 <b>Información de Envíos:</b> Despachamos cosechas frescas directamente desde los Montes de María a nivel regional y nacional. Los tiempos estimados de entrega son de 24 a 48 horas con empaques protegidos.',
      factura: '🧾 <b>Facturación Electrónica:</b> Tu factura de venta oficial es enviada automáticamente a tu correo electrónico al confirmar la compra. También puedes descargarla desde tu perfil en la sección Mis Compras.',
      calidad: '🌱 <b>Garantía Campesina:</b> Todos nuestros productos provienen de cosechas agroecológicas y artesanales de familias productoras de Montes de María. Garantizamos 100% de frescura y peso exacto.'
    };

    const textToSend = macros[macroType] || 'Con mucho gusto te asistimos desde el equipo de De los Montes de María.';
    await this.responderTicket(chatId, ticketCode, textToSend, authUser);
    await this.sendMessage(chatId, `✅ <b>Macro enviada exitosamente al ticket #${ticketCode}.</b>`);
  }

  async aprobarVendedorDesdeTelegram(chatId, vendorId, authUser) {
    try {
      const db = require('../persistence/Database');
      const vId = parseInt(vendorId, 10);
      await new Promise((res, rej) => {
        db.query('UPDATE usuarios SET id_rol = 2 WHERE id_usuario = ?', [vId], (err, r) => err ? rej(err) : res(r));
      });

      if (this.usuarioRepository) {
        const user = await this.usuarioRepository.buscarPorId(vId);
        if (user && this.emailService && user.correo) {
          this.emailService.sendMailSafe({
            to: user.correo,
            subject: '🌱 ¡Tu cuenta de Vendedor Campesino ha sido Aprobada!',
            html: `
              <p>Hola <strong>${user.nombre || 'Productor'}</strong>,</p>
              <p>¡Nos alegra informarte que tu solicitud como <strong>Vendedor Campesino</strong> en De los Montes de María ha sido aprobada por el administrador!</p>
              <p>Ya puedes ingresar a la plataforma y publicar tus cosechas para toda Colombia.</p>
            `
          }).catch(() => {});
        }
      }

      await this.sendMessage(chatId, `🎉 <b>¡Vendedor #${vId} Aprobado con Éxito!</b>\nEl usuario ahora tiene permisos activos de campesino vendedor en la plataforma.`);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Error al aprobar vendedor: ${err.message}`);
    }
  }

  async mostrarStockCritico(chatId) {
    if (!this.productoRepository) return;
    try {
      const productos = typeof this.productoRepository.listarTodos === 'function'
        ? await this.productoRepository.listarTodos()
        : await this.productoRepository.buscarTodos();
      const criticos = (productos || []).filter((p) => Number(p.stock || 0) <= 5);

      if (criticos.length === 0) {
        await this.sendMessage(chatId, '✅ <b>¡Todo el inventario está en niveles óptimos!</b> No hay cosechas con menos de 5 unidades.');
        return;
      }

      let lista = '⚠️ <b>COSECHAS CON STOCK BAJO (≤5 unidades):</b>\n━━━━━━━━━━━━━━━━━━\n';
      criticos.forEach((p) => {
        lista += `\n📦 <b>${p.nombre || p.nombre_producto}</b> (ID: <code>#${p.id_producto || p.id}</code>)\n   🌾 Stock: <b>${p.stock} unidades</b> ($${Number(p.precio || 0).toLocaleString('es-CO')})\n`;
      });

      lista += '\n💡 <i>Para reabastecer escribe:</i> <code>/stock [ID] [Cantidad]</code>';

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
      const productos = typeof this.productoRepository.listarTodos === 'function'
        ? await this.productoRepository.listarTodos()
        : await this.productoRepository.buscarTodos();
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
        lista += `\n🌱 <b>${p.nombre || p.nombre_producto}</b> (ID: <code>#${p.id_producto || p.id}</code>)\n   📦 Stock: <code>${p.stock} unidades</code> | 💵 <b>$${Number(p.precio || 0).toLocaleString('es-CO')} COP</b>\n`;
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

