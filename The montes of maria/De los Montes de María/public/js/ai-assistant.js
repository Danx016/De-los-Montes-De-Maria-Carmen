// Lógica del Cliente para el Asistente Agro-IA

document.addEventListener("DOMContentLoaded", () => {
  const chatFloatBtn = document.getElementById("ai-chat-float-btn");
  const chatContainer = document.getElementById("ai-chat-widget-container");
  const chatCloseBtn = document.getElementById("ai-chat-close-btn");
  const chatForm = document.getElementById("ai-chat-form");
  const chatInput = document.getElementById("ai-chat-input");
  const chatBody = document.getElementById("ai-chat-messages-body");

  if (!chatFloatBtn || !chatContainer || !chatCloseBtn || !chatForm || !chatInput || !chatBody) {
    console.warn("Asistente Agro-IA: No se encontraron los elementos necesarios en el DOM.");
    return;
  }

  // Historial de la conversación en memoria
  let conversationHistory = [];

  // Detectar si estamos en el Panel de Administración
  const isAdminPage = document.body.classList.contains("admin-page") ||
                      window.location.pathname.includes("/admin") ||
                      document.querySelector(".admin-layout") !== null;

  const chatEndpoint = isAdminPage ? "/api/chat/admin-chat" : "/api/chat";

  // Si es el panel de admin, adaptar la interfaz a AdminIA
  if (isAdminPage) {
    chatContainer.classList.add("admin-mode");
    chatFloatBtn.classList.add("admin-mode-float");
    
    // Cambiar íconos y títulos
    const floatIcon = chatFloatBtn.querySelector("i");
    if (floatIcon) floatIcon.className = "fa fa-user-shield";

    const avatarIcon = chatContainer.querySelector(".ai-chat-avatar i");
    if (avatarIcon) avatarIcon.className = "fa fa-user-shield";

    const titleEl = chatContainer.querySelector(".ai-chat-info h4");
    if (titleEl) titleEl.innerHTML = 'AdminIA <span class="ai-admin-badge">ADMIN</span>';

    const subtitleEl = chatContainer.querySelector(".ai-chat-info span");
    if (subtitleEl) subtitleEl.textContent = "Asistente de Gestión y Negocios";

    // Mensaje de bienvenida inicial para el Admin
    const initialMsgEl = chatBody.querySelector(".ai-message.bot");
    if (initialMsgEl) {
      initialMsgEl.innerHTML = `¡Hola Administrador! 📊 Soy <strong>AdminIA</strong>, tu asistente ejecutivo de <strong>De los Montes de María</strong>.<br><br>Puedo darte reportes de ventas, alertas de inventario bajo, métricas de usuarios y ayudarte con la gestión de la tienda. ¿En qué te colaboro hoy?`;
    }
  }

  // Abrir Chat
  chatFloatBtn.addEventListener("click", () => {
    chatContainer.classList.add("open");
    document.body.classList.add("ai-chat-open");
    chatInput.focus();
    scrollToBottom();
  });

  // Escuchar clics en los botones de sugerencias rápidas (chips)
  chatBody.addEventListener("click", (e) => {
    const chip = e.target.closest(".ai-chip");
    if (chip) {
      const msg = chip.getAttribute("data-msg");
      if (msg) {
        chatInput.value = msg;
        chatForm.dispatchEvent(new Event("submit"));
      }
    }
  });

  // Cerrar Chat
  chatCloseBtn.addEventListener("click", () => {
    chatContainer.classList.remove("open");
    document.body.classList.remove("ai-chat-open");
  });

  // Escuchar el envío del formulario
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userMessageText = chatInput.value.trim();
    if (!userMessageText) return;

    chatInput.value = "";
    setControlsDisabled(true);

    // 1. Mostrar mensaje del usuario en el chat
    appendMessage("user", userMessageText);

    // 2. Mostrar indicador de escribiendo
    const typingIndicator = appendTypingIndicator();

    try {
      // Formatear el historial para la API (role: 'user' | 'assistant')
      const historyPayload = conversationHistory.map(msg => ({
        role: msg.role,
        text: msg.text
      }));

      // 3. Enviar petición al backend (dinámico según el entorno: Cliente o Admin)
      const response = await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessageText,
          history: historyPayload
        })
      });

      typingIndicator.remove();

      if (!response.ok) {
        throw new Error(`Servidor respondió con código de error ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.reply || "Disculpa, no logré procesar tu respuesta.";

      // 4. Mostrar respuesta del bot
      appendMessage("bot", botReply);

      // Guardar en el historial local
      conversationHistory.push({ role: "user", text: userMessageText });
      conversationHistory.push({ role: "assistant", text: botReply });

      // Limitar historial (últimas 10 interacciones)
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }

    } catch (error) {
      console.error("Error en el chat de IA:", error);
      typingIndicator.remove();
      appendMessage("bot", "Disculpa la molestia. Parece que hubo un problema temporal de conexión. ¿Podrías volver a intentarlo en un momento?");
    } finally {
      setControlsDisabled(false);
      chatInput.focus();
    }
  });

  // Habilitar / Deshabilitar inputs
  function setControlsDisabled(disabled) {
    chatInput.disabled = disabled;
    const sendBtn = chatForm.querySelector("button");
    if (sendBtn) sendBtn.disabled = disabled;
  }

  // Insertar un mensaje en el DOM
  function appendMessage(sender, text) {
    const messageEl = document.createElement("div");
    messageEl.className = `ai-message ${sender}`;
    
    if (sender === "bot") {
      messageEl.innerHTML = parseMarkdown(text);
    } else {
      messageEl.textContent = text;
    }

    chatBody.appendChild(messageEl);
    scrollToBottom();
  }

  // Mostrar indicador de escribiendo
  function appendTypingIndicator() {
    const indicatorEl = document.createElement("div");
    indicatorEl.className = "ai-message bot";
    indicatorEl.innerHTML = `
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    chatBody.appendChild(indicatorEl);
    scrollToBottom();
    return indicatorEl;
  }

  // Auto-scroll al final del chat
  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Parser de Markdown mejorado para respuestas del Bot
  function parseMarkdown(text) {
    if (!text) return "";

    // Escapar HTML básico para evitar XSS
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convertir encabezados Markdown (### Título, ## Título, # Título)
    html = html.replace(/^### (.+)$/gm, '<h4 class="ai-md-heading">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="ai-md-heading">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h3 class="ai-md-heading">$1</h3>');

    // Convertir negritas (**texto**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Convertir cursivas (*texto*) — solo si no es parte de un asterisco de lista
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

    // Convertir etiquetas especiales [AGRO_ADD_CART: id|nombre|precio|presentacion|disponibilidad|imagen] a botones interactivos de carrito
    html = html.replace(/\[AGRO_ADD_CART:\s*([^|]+)\|([^|]+)\|([^|]+)\|([^|]*)\|([^|]*)\|([^\]]*)\]/g, (match, id, nombre, precio, presentacion, disponibilidad, imagen) => {
      const cleanId = id.trim();
      const cleanNombre = nombre.trim();
      const cleanPrecio = precio.trim();
      const cleanPres = presentacion ? presentacion.trim() : 'Unidad';
      const cleanDisp = disponibilidad ? disponibilidad.trim() : '50';
      const cleanImg = imagen ? imagen.trim() : '';

      return `<div class="ai-cart-btn-wrapper">
        <button type="button" class="btn-add-to-cart ai-add-cart-btn" 
          data-id="${cleanId}" 
          data-nombre="${cleanNombre}" 
          data-precio="${cleanPrecio}" 
          data-presentacion="${cleanPres}" 
          data-disponibilidad="${cleanDisp}" 
          data-imagen="${cleanImg}">
          <i class="fa fa-shopping-cart"></i> Añadir ${cleanNombre} al carrito
        </button>
      </div>`;
    });

    // Procesar líneas para listas y párrafos
    const lines = html.split("\n");
    let inList = false;
    let result = [];

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Detectar items de lista (con o sin indentación)
      const listMatch = trimmed.match(/^[\s]*[*\-]\s+(.+)$/);
      if (listMatch) {
        if (!inList) {
          result.push("<ul>");
          inList = true;
        }
        result.push(`<li>${listMatch[1]}</li>`);
      } else {
        if (inList) {
          result.push("</ul>");
          inList = false;
        }

        // Las líneas con <h3> o <h4> ya son elementos de bloque
        if (trimmed.startsWith("<h3") || trimmed.startsWith("<h4")) {
          result.push(trimmed);
        } else if (trimmed) {
          result.push(`<p>${trimmed}</p>`);
        }
      }
    });

    if (inList) {
      result.push("</ul>");
    }

    // Limpiar párrafos vacíos consecutivos
    return result.join("")
      .replace(/<p><\/p>/g, "")
      .replace(/<br>\s*<br>/g, "<br>");
  }
});
