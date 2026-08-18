/**
 * Servicio externo: IAService
 * Integra OpenRouter / OpenAI para Asistente de Tienda, Asistente de Soporte y Asistente de Administrador con Function Calling
 */
const bcrypt = require('bcrypt');
const appConfig = require('../config/app.config');

class IAService {
  constructor(emailService) {
    this.emailService = emailService;
    this.pendingVerifications = new Map();
    this.pendingInput = new Map();
  }

  // ==========================================
  // 1. ASISTENTE PÚBLICO DE LA TIENDA (AgroAsistente)
  // ==========================================
  async procesarChatPublico(message, history = [], productos = []) {
    const apiKey = appConfig.openRouterApiKey;
    const model = appConfig.openRouterModel;

    if (!apiKey || apiKey.startsWith('tu_clave')) {
      return '⚠️ **Configuración Requerida:** Configure una clave de API válida en `OPENROUTER_API_KEY` para activar el Asistente de IA.';
    }

    const offTopicPatterns = [
      /\b(presidente|politica|política|gobierno|guerra|conflicto|noticias|deporte|fútbol|futbol|música|musica|película|pelicula|serie|netflix|youtube|twitter|facebook|instagram|tiktok|chiste|broma|poema|cuento|filosofia|filosofía|matemática|matematica|programar|código|codigo|python|javascript|java|html|css)\b/i,
      /\b(quién es|quien es|que es el|qué es el|dime sobre|cuéntame sobre|cuentame sobre|explícame|explicame|háblame de|hablame de)\b(?!.*(producto|semilla|abono|fertilizante|herramienta|pago|envío|envio|carrito|tienda|montes de maria|agroasistente|catalogo|catálogo|stock|precio|presentacion|disponibilidad|receta|cocina|cultivo|cosecha|riego|campo|animal|lácteo|lacteo|fruta|verdura|hortaliza))/i
    ];

    if (offTopicPatterns.some(pattern => pattern.test(message))) {
      return `Lo siento, solo puedo ayudarte con temas relacionados a **De los Montes de María** 🌾\n\nPuedo asistirte con:\n- 🌱 **Nuestro catálogo** de semillas, abonos, herramientas y nutrición animal\n- 🍳 **Recetas e ideas** con nuestros productos\n- 🔧 **Recomendaciones de herramientas** para tu finca o cultivo\n- 💳 **Métodos de pago y envíos**\n\n¿En qué puedo ayudarte hoy?`;
    }

    const systemInstruction = `Eres AgroAsistente, el asistente virtual oficial de "De los Montes de María", tienda agropecuaria colombiana en El Carmen de Bolívar.
Conoces a fondo todos los productos del catálogo:
${JSON.stringify(productos)}

Medios de pago: Tarjeta de Crédito/Débito, Agro-Créditos, Wompi, ePayco y PayPal.
Envíos a toda Colombia.

REGLAS DE FORMATO:
- Cuando recomiendes un producto, INCLUYE SIEMPRE la etiqueta especial:
  * **Insumo:** [Nombre]
  * **Precio:** $[Precio] COP
  * **Presentación:** [Presentación] | **Disponibilidad:** [Cantidad]
  [AGRO_ADD_CART: id_producto|nombre_producto|precio|presentacion|disponibilidad|imagen]`;

    const messages = [{ role: 'system', content: systemInstruction }];
    history.forEach(item => {
      messages.push({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: item.text || item.content
      });
    });
    messages.push({ role: 'user', content: message });

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': appConfig.baseUrl,
          'X-Title': 'De los Montes de Maria Store AI'
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 600 })
      });

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || 'Entendido.';
    } catch (err) {
      console.error('Error en procesarChatPublico:', err);
      return `❌ Error al conectar con el Asistente de IA: ${err.message}`;
    }
  }

  // ==========================================
  // 2. ASISTENTE DE ADMINISTRACIÓN (AdminIA)
  // ==========================================
  async procesarChatAdmin(prompt, history = [], adminUserId = 1, repositories) {
    const apiKey = appConfig.openRouterApiKey;
    if (!apiKey || apiKey.startsWith('tu_clave')) {
      return { respuesta: '⚠️ La API Key de OpenRouter no está configurada en las variables de entorno.' };
    }

    const { usuarioRepository, productoRepository, compraRepository } = repositories;

    const ADMIN_TOOLS = [
      {
        type: 'function',
        function: {
          name: 'list_products',
          description: 'Obtiene la lista de productos del catálogo.',
          parameters: { type: 'object', properties: { search: { type: 'string' } } }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_product',
          description: 'Crea un nuevo producto en el catálogo.',
          parameters: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              precio: { type: 'number' },
              descripcion: { type: 'string' },
              categoria: { type: 'string' },
              imagen: { type: 'string' }
            },
            required: ['nombre', 'precio']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_product',
          description: 'Elimina un producto por ID o nombre.',
          parameters: {
            type: 'object',
            properties: {
              id_producto: { type: 'integer' },
              nombre: { type: 'string' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_users',
          description: 'Lista usuarios registrados.',
          parameters: { type: 'object', properties: { search: { type: 'string' } } }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_orders',
          description: 'Lista pedidos y compras registradas.',
          parameters: { type: 'object', properties: { search: { type: 'string' }, id_compra: { type: 'integer' } } }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_order',
          description: 'Actualiza el estado de una compra.',
          parameters: {
            type: 'object',
            properties: {
              id_compra: { type: 'integer' },
              estado: { type: 'string' }
            },
            required: ['id_compra', 'estado']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_order',
          description: 'Elimina una compra permanentemente.',
          parameters: {
            type: 'object',
            properties: { id_compra: { type: 'integer' } },
            required: ['id_compra']
          }
        }
      }
    ];

    const executeTool = async (name, args) => {
      if (name === 'list_products') {
        const rows = args.search ? await productoRepository.buscar(args.search) : await productoRepository.listarTodos();
        return { success: true, count: rows.length, productos: rows.slice(0, 15) };
      }
      if (name === 'create_product') {
        const prod = await productoRepository.crear({
          nombre_producto: args.nombre,
          precio: args.precio,
          descripcion: args.descripcion || '',
          categoria: args.categoria || 'cosechas',
          imagen: args.imagen || '/img/Logo.jpg'
        });
        return { success: true, message: `Producto "${args.nombre}" creado exitosamente`, producto: prod };
      }
      if (name === 'delete_product') {
        let targetId = args.id_producto;
        if (!targetId && args.nombre) {
          const found = await productoRepository.buscar(args.nombre);
          if (found && found.length > 0) targetId = found[0].id_producto;
        }
        if (!targetId) return { success: false, error: 'Producto no encontrado' };
        await productoRepository.eliminar(targetId);
        return { success: true, message: `Producto #${targetId} eliminado correctamente.` };
      }
      if (name === 'list_users') {
        const rows = await usuarioRepository.listarTodos(args.search);
        return { success: true, count: rows.length, usuarios: rows.slice(0, 15) };
      }
      if (name === 'list_orders') {
        const rows = await compraRepository.listarTodas(args.search);
        return { success: true, count: rows.length, compras: rows.slice(0, 15) };
      }
      if (name === 'update_order') {
        await compraRepository.actualizarEstado(args.id_compra, args.estado);
        return { success: true, message: `Compra #${args.id_compra} actualizada a estado: ${args.estado}` };
      }
      if (name === 'delete_order') {
        await compraRepository.eliminar(args.id_compra);
        return { success: true, message: `Compra #${args.id_compra} eliminada exitosamente.` };
      }
      return { success: false, error: 'Herramienta no reconocida' };
    };

    const systemMessage = {
      role: 'system',
      content: `Eres el Asistente de IA de Administración de "De los Montes de María S.A.S".
Ayudas al Administrador a gestionar el sistema, inventario, usuarios y pedidos.
Cuando te soliciten crear, listar, modificar o eliminar productos, usuarios o pedidos, invoca la herramienta correspondiente inmediatamente.`
    };

    const messages = [systemMessage, ...history, { role: 'user', content: prompt }];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': appConfig.baseUrl,
          'X-Title': 'De los Montes de Maria Admin IA'
        },
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages, tools: ADMIN_TOOLS, tool_choice: 'auto' })
      });

      const data = await response.json();
      const choice = data?.choices?.[0];
      if (!choice) return { respuesta: 'No se recibió respuesta del modelo.' };

      const message = choice.message;
      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message);
        for (const toolCall of message.tool_calls) {
          let fnArgs = {};
          try { fnArgs = JSON.parse(toolCall.function.arguments); } catch (_) {}
          const toolResult = await executeTool(toolCall.function.name, fnArgs);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(toolResult)
          });
        }

        const secondRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': appConfig.baseUrl
          },
          body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages })
        });
        const secondData = await secondRes.json();
        return { respuesta: secondData?.choices?.[0]?.message?.content || 'Acción ejecutada con éxito.', reloadData: true };
      }

      return { respuesta: message.content || 'Entendido.' };
    } catch (err) {
      console.error('Error en procesarChatAdmin:', err);
      return { respuesta: `⚠️ Error al procesar solicitud con la IA: ${err.message}` };
    }
  }

  // ==========================================
  // 3. ASISTENTE DE SOPORTE EN VIVO
  // ==========================================
  async procesarMensajeSoporte({ session_id, ticket, mensaje, id_usuario, repositories }) {
    const { usuarioRepository, productoRepository, compraRepository } = repositories;
    const correo = ticket.correo_cliente;

    const pendingInput = this.pendingInput.get(session_id);
    if (pendingInput && pendingInput.action === 'set_new_password') {
      if (mensaje.trim().length < 8) return 'La contraseña debe tener al menos 8 caracteres. Intenta de nuevo:';
      this.pendingInput.delete(session_id);
      await usuarioRepository.actualizarContrasena(pendingInput.id_usuario, mensaje.trim());
      return 'Tu contraseña ha sido actualizada exitosamente.';
    }

    if (/^\d{6}$/.test(mensaje.trim()) && this.pendingVerifications.has(session_id)) {
      const pv = this.pendingVerifications.get(session_id);
      if (Date.now() > pv.expires) {
        this.pendingVerifications.delete(session_id);
        return 'El código ha expirado. Por favor solicita el cambio nuevamente.';
      }
      if (mensaje.trim() === pv.code) {
        this.pendingVerifications.delete(session_id);
        if (pv.action === 'cambiar_nombre') {
          await usuarioRepository.actualizar(pv.id_usuario, { nombre: pv.data.nuevo_nombre });
          return `Tu nombre ha sido actualizado a **${pv.data.nuevo_nombre}**.`;
        }
        if (pv.action === 'cambiar_apodo') {
          await usuarioRepository.actualizar(pv.id_usuario, { apodo: pv.data.nuevo_apodo });
          return `Tu apodo ha sido actualizado a **${pv.data.nuevo_apodo}**.`;
        }
        if (pv.action === 'cambiar_correo') {
          await usuarioRepository.actualizar(pv.id_usuario, { correo: pv.data.nuevo_correo });
          return `Tu correo ha sido actualizado a **${pv.data.nuevo_correo}**.`;
        }
        if (pv.action === 'cambiar_password') {
          this.pendingInput.set(session_id, { action: 'set_new_password', id_usuario: pv.id_usuario });
          return 'Código verificado correctamente. Por favor ingresa tu **nueva contraseña** (mínimo 8 caracteres):';
        }
        if (pv.action === 'eliminar_cuenta') {
          await usuarioRepository.eliminar(pv.id_usuario);
          return 'Tu cuenta ha sido eliminada permanentemente del sistema.';
        }
      } else {
        return 'Código incorrecto. Verifica e intenta de nuevo.';
      }
    }

    const apiKey = appConfig.openRouterApiKey;
    if (!apiKey || apiKey.startsWith('tu_clave')) {
      return 'El asistente de IA no está configurado. Presiona **"Hablar con un asesor"** para contactar con soporte humano.';
    }

    const SUPPORT_TOOLS = [
      {
        type: 'function',
        function: {
          name: 'get_user_orders',
          description: 'Obtiene los pedidos y compras del usuario.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_products',
          description: 'Busca productos en la tienda.',
          parameters: { type: 'object', properties: { busqueda: { type: 'string' } } }
        }
      },
      {
        type: 'function',
        function: {
          name: 'request_change_password',
          description: 'Inicia cambio de contraseña enviando código de seguridad al correo.',
          parameters: { type: 'object', properties: {} }
        }
      }
    ];

    const executeTool = async (name, args) => {
      if (name === 'get_user_orders') {
        if (!id_usuario) return { found: false, message: 'Usuario no autenticado' };
        const orders = await compraRepository.listarPorUsuario(id_usuario);
        return { found: true, pedidos: orders.slice(0, 5) };
      }
      if (name === 'get_products') {
        const prods = await productoRepository.buscar(args.busqueda || '');
        return { found: prods.length > 0, productos: prods.slice(0, 5) };
      }
      if (name === 'request_change_password') {
        if (!id_usuario) return { error: 'Debes iniciar sesión para cambiar contraseña' };
        const code = String(Math.floor(100000 + Math.random() * 900000));
        this.pendingVerifications.set(session_id, {
          action: 'cambiar_password',
          code,
          expires: Date.now() + 600000,
          id_usuario
        });
        await this.emailService.sendSecurityCodeEmail(correo, code, 'cambio de contraseña');
        return { sent: true, message: `Código de seguridad enviado a ${correo}` };
      }
      return { error: 'Herramienta desconocida' };
    };

    const systemPrompt = `Eres el asistente virtual de soporte de "De los Montes de María".
Cliente: ${ticket.nombre_cliente} (${correo}).
Responde con amabilidad, precisión y concisión. Usa las herramientas cuando sea necesario.`;

    const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: mensaje }];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': appConfig.baseUrl
        },
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages, tools: SUPPORT_TOOLS, tool_choice: 'auto' })
      });

      const data = await response.json();
      const choice = data?.choices?.[0];
      if (!choice) return 'No pude procesar tu solicitud. Escribe **"hablar con soporte"** para hablar con un asesor humano.';

      const aiMsg = choice.message;
      if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
        const toolCall = aiMsg.tool_calls[0];
        let toolArgs = {};
        try { toolArgs = JSON.parse(toolCall.function.arguments); } catch (_) {}
        const toolResult = await executeTool(toolCall.function.name, toolArgs);

        messages.push(aiMsg);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(toolResult)
        });

        const res2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': appConfig.baseUrl
          },
          body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages })
        });
        const data2 = await res2.json();
        return data2?.choices?.[0]?.message?.content || 'Solicitud procesada.';
      }

      return aiMsg.content || 'Entendido.';
    } catch (err) {
      console.error('Error en procesarMensajeSoporte:', err);
      return 'Ocurrió un error. Haz clic en **"Hablar con un asesor"** para ser atendido por un agente.';
    }
  }
}

module.exports = IAService;
