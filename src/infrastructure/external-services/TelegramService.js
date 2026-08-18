/**
 * Servicio Externo: TelegramService
 * Integración con la API oficial de Telegram Bot (montesdemariabot)
 * - Notificaciones instantáneas de nuevas compras y pedidos a administradores
 * - Alertas de tickets de soporte y solicitud de asesores humanos
 * - Comandos interactivos (/start, /catalogo, /pedidos, /ayuda, /id)
 */
const https = require('https');

class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '8827545163:AAHKvReHgrEm5LXBjZ2YYJChBqZQ1f0-AJo';
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME || 'montesdemariabot';
    this.adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || null;
    this.subscribers = new Set();

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
        timeout: 10000,
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
      console.log(`[Telegram] Nuevo suscriptor registrado para alertas: ${chatId}`);
    }
  }

  /**
   * Notificar Nueva Compra / Pedido a Administradores
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
      const prodId = producto?.id_producto || producto?.id || '';
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
   * Notificar Cambio de Estado de Pedido (En preparación, En camino, Entregado)
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
   * Notificar Nuevo Ticket de Soporte
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
   * Procesador de Webhook de Telegram para responder a comandos
   */
  async procesarUpdate(update) {
    try {
      if (!update || !update.message) return { ok: true };

      const message = update.message;
      const chatId = message.chat?.id;
      const text = (message.text || '').trim();
      const from = message.from || {};
      const userName = from.first_name || from.username || 'Amigo';

      if (!chatId) return { ok: true };

      // Registrar chat para alertas
      this.registerSubscriber(chatId);

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

      if (text.startsWith('/start producto_') || text.includes('producto')) {
        const msg = `
🌾 <b>¡Hola ${userName}!</b>
¿Tienes alguna duda sobre nuestras cosechas o productos?

Escríbenos tu pregunta y te responderemos de inmediato o explora todo el catálogo aquí:
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
<i>(Tu chat ha quedado registrado para recibir alertas de pedidos, stock y soporte)</i>

<b>Comandos disponibles:</b>
🛒 <code>/tienda</code> - Ver catálogo de cosechas
📦 <code>/pedidos</code> - Información sobre despachos
🌾 <code>/campesinos</code> - Conocer a nuestros productores
❓ <code>/ayuda</code> - Contacto directo con soporte
🆔 <code>/id</code> - Ver tu Chat ID
`;
        await this.sendMessage(chatId, welcome);
      } else if (text.startsWith('/id')) {
        await this.sendMessage(chatId, `Tu Chat ID de Telegram es: <code>${chatId}</code>`);
      } else if (text.startsWith('/tienda') || text.startsWith('/catalogo')) {
        await this.sendMessage(chatId, `🛒 Explora cosechas frescas y productos del campo en nuestra web oficial:\n👉 https://delosmontesdemaria.onrender.com/catalogo`);
      } else if (text.startsWith('/pedidos')) {
        await this.sendMessage(chatId, `📦 Realizamos envíos directos desde los Montes de María (San Jacinto, El Carmen de Bolívar, etc.) hasta tu hogar con frescura garantizada.`);
      } else if (text.startsWith('/ayuda') || text.startsWith('/soporte')) {
        await this.sendMessage(chatId, `💬 ¿Necesitas asistencia en vivo? Inicia una consulta en nuestro centro de soporte:\n👉 https://delosmontesdemaria.onrender.com/soporte`);
      } else {
        await this.sendMessage(chatId, `¡Hola ${userName}! Recibimos tu mensaje. Para acceder al catálogo ingresa a https://delosmontesdemaria.onrender.com o escribe /ayuda.`);
      }

      return { ok: true };
    } catch (err) {
      console.error('[Telegram Webhook Error]:', err);
      return { ok: false, error: err.message };
    }
  }
}

module.exports = TelegramService;
