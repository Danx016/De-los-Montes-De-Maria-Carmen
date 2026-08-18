document.addEventListener('DOMContentLoaded', () => {
  // ─── Elementos ───
  const stepForm = document.getElementById('soporte-step-form');
  const stepChat = document.getElementById('soporte-step-chat');
  const form = document.getElementById('soporte-form');
  const chatForm = document.getElementById('soporte-chat-form');
  const chatInput = document.getElementById('soporte-chat-input');
  const chatMessages = document.getElementById('soporte-chat-messages');
  const typingEl = document.getElementById('soporte-typing');
  const agentName = document.getElementById('soporte-agent-name');
  const agentStatus = document.getElementById('soporte-agent-status');
  const agentAvatar = document.getElementById('soporte-agent-avatar');
  const ticketBadge = document.getElementById('soporte-ticket-badge');
  const escalateBtn = document.getElementById('soporte-escalate-btn');
  const escalateBar = document.getElementById('soporte-escalate-bar');

  // Si we're not on /soporte page, exit
  if (!stepForm || !stepChat) return;

  let ticketData = null; // { ticketCode, ticketId, sessionId }
  let socket = null;

  // ─── PASO 1: Enviar formulario ───
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('soporte-nombre').value.trim();
    const correo = document.getElementById('soporte-correo').value.trim();
    const telefono = document.getElementById('soporte-telefono').value.trim();
    const asunto = document.getElementById('soporte-asunto').value;

    if (!nombre || !correo || !telefono || !asunto) return;

    // Deshabilitar botón
    const btn = form.querySelector('.soporte-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creando ticket...';

    try {
      const csrfToken = getCsrf();
      const res = await fetch('/api/soporte/crear-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify({ nombre, correo, telefono, asunto })
      });

      const data = await res.json();

      if (data.error) {
        showNotif(data.error, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-arrow-right"></i> Iniciar conversación';
        return;
      }

      ticketData = {
        ticketCode: data.ticketCode,
        ticketId: data.ticketId,
        sessionId: data.sessionId
      };

      // Guardar en sessionStorage para persistir si recarga
      sessionStorage.setItem('soporte_ticket', JSON.stringify(ticketData));

      // Mostrar chat
      stepForm.classList.remove('active');
      stepChat.classList.add('active');

      ticketBadge.textContent = data.ticketCode;

      // Mostrar bienvenida
      appendMsg('bot', data.bienvenida, 'Asistente Bot');

      // Conectar Socket.IO
      connectSocket();

      chatInput.focus();

    } catch (err) {
      console.error('Error creando ticket:', err);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-arrow-right"></i> Iniciar conversación';
    }
  });

  // ─── Restaurar sesión si existe ───
  const savedTicket = sessionStorage.getItem('soporte_ticket');
  if (savedTicket) {
    try {
      ticketData = JSON.parse(savedTicket);
      stepForm.classList.remove('active');
      stepChat.classList.add('active');
      ticketBadge.textContent = ticketData.ticketCode;

      // Verificar si el ticket ya fue cerrado
      fetch(`/api/soporte/estado/${ticketData.sessionId}`)
        .then(r => r.json())
        .then(st => {
          if (st && st.estado === 'cerrado') {
            fetch(`/api/soporte/historial/${ticketData.sessionId}`)
              .then(r => r.json())
              .then(msgs => {
                msgs.forEach(m => appendMsg(m.rol, m.mensaje, m.nombre_remitente, m.fecha));
                handleTicketClosed('Esta solicitud ya ha sido resuelta y cerrada.');
              });
          } else {
            // Cargar historial normal
            fetch(`/api/soporte/historial/${ticketData.sessionId}`)
              .then(r => r.json())
              .then(msgs => {
                msgs.forEach(m => appendMsg(m.rol, m.mensaje, m.nombre_remitente, m.fecha));
                scrollToBottom();
              });
            connectSocket();
          }
        })
        .catch(() => connectSocket());

    } catch (e) {
      sessionStorage.removeItem('soporte_ticket');
    }
  }

  // ─── PASO 2: Enviar mensaje ───
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = chatInput.value.trim();
    if (!text || !ticketData) return;

    if (chatInput.disabled) {
      showNotif('Este ticket ha sido cerrado. Por favor crea una nueva solicitud.', 'warning');
      return;
    }

    // Mostrar mensaje del usuario inmediatamente
    // ─── Attach button & upload ───
    const attachBtn = document.getElementById('soporte-btn-attach');
    const fileInput = document.getElementById('soporte-file-input');

    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('imagen', file);

        attachBtn.disabled = true;
        attachBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

        try {
          const csrfToken = getCsrf();
          const r = await fetch('/api/soporte/upload-imagen', {
            method: 'POST',
            headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
            body: formData
          });
          const d = await r.json();
          attachBtn.disabled = false;
          attachBtn.innerHTML = '<i class="fa fa-camera"></i>';
          fileInput.value = '';

          if (d.ok && d.url) {
            chatInput.value = `[IMAGEN] ${d.url}`;
            chatForm.dispatchEvent(new Event('submit'));
          } else {
            showNotif(d.error || 'Error al subir imagen', 'error');
          }
        } catch (e) {
          attachBtn.disabled = false;
          attachBtn.innerHTML = '<i class="fa fa-camera"></i>';
          fileInput.value = '';
          showNotif('Error al subir imagen', 'error');
        }
      });
    }

    appendMsg('user', text, 'Tú');
    chatInput.value = '';
    scrollToBottom();

    // Mostrar typing
    typingEl.style.display = 'flex';
    scrollToBottom();

    try {
      const csrfToken = getCsrf();
      const res = await fetch('/api/soporte/mensaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify({
          session_id: ticketData.sessionId,
          ticket_id: ticketData.ticketId,
          mensaje: text
        })
      });

      const data = await res.json();
      typingEl.style.display = 'none';

      if (data.closed) {
        handleTicketClosed(data.error);
        return;
      }

      if (data.reply) {
        if (data.escalated) {
          appendMsg('system', data.reply, 'Sistema');
          switchToHumanMode();
        } else {
          appendMsg('bot', data.reply, 'Asistente Bot');
        }
      }

      scrollToBottom();

    } catch (err) {
      typingEl.style.display = 'none';
      showNotif('Error de conexión. Intenta de nuevo.', 'error');
    }
  });

  // ─── Botón de escalar ───
  if (escalateBtn) {
    escalateBtn.addEventListener('click', () => {
      chatInput.value = 'Quiero hablar con un asesor';
      chatForm.dispatchEvent(new Event('submit'));
    });
  }

  // ─── Modal de Confirmación Estilizado del Proyecto ───
  function showConfirmModal(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const acceptBtn = document.getElementById('confirm-btn-accept');
      const cancelBtn = document.getElementById('confirm-btn-cancel');

      if (!modal) {
        resolve(confirm(message));
        return;
      }

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;

      modal.classList.add('open');

      function onAccept() {
        cleanup();
        resolve(true);
      }

      function onCancel() {
        cleanup();
        resolve(false);
      }

      function cleanup() {
        modal.classList.remove('open');
        acceptBtn.removeEventListener('click', onAccept);
        cancelBtn.removeEventListener('click', onCancel);
      }

      acceptBtn.addEventListener('click', onAccept);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // ─── Botón de abandonar conversación ───
  const abandonBtn = document.getElementById('soporte-btn-abandonar');
  if (abandonBtn) {
    abandonBtn.addEventListener('click', async () => {
      if (!ticketData) return;
      const confirmed = await showConfirmModal(
        '¿Abandonar Conversación?',
        '¿Estás seguro de que deseas abandonar la conversación? El ticket se dará por finalizado.'
      );
      if (!confirmed) return;

      try {
        const csrfToken = getCsrf();
        const res = await fetch('/api/soporte/abandonar-ticket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
          },
          body: JSON.stringify({
            session_id: ticketData.sessionId,
            ticket_id: ticketData.ticketId
          })
        });

        const data = await res.json();
        if (data.ok) {
          handleTicketClosed('Has abandonado la conversación de soporte.');
        } else {
          showNotif(data.error || 'Error al abandonar.', 'error');
        }
      } catch (e) {
        showNotif('Error de conexión.', 'error');
      }
    });
  }

  // ─── Socket.IO ───
  function connectSocket() {
    if (typeof io === 'undefined') return;

    socket = io('/soporte');
    socket.emit('unirse_sala', { session_id: ticketData.sessionId, rol: 'user' });

    socket.on('nuevo_mensaje', (msg) => {
      if (msg.session_id === ticketData.sessionId && msg.rol === 'admin') {
        appendMsg('admin', msg.mensaje, msg.nombre_remitente, msg.fecha);
        switchToHumanMode();
        scrollToBottom();
      }
    });

    socket.on('ticket_cerrado_cliente', (data) => {
      handleTicketClosed(data.mensaje);
    });
  }

  function switchToHumanMode() {
    agentName.textContent = 'Soporte Admin';
    agentStatus.textContent = 'Asesor';
    agentAvatar.innerHTML = '<i class="fa fa-user-tie"></i>';
    if (escalateBar) escalateBar.style.display = 'none';
  }

  function handleTicketClosed(msg) {
    const activeTicketInfo = ticketData || JSON.parse(sessionStorage.getItem('soporte_ticket') || '{}');

    sessionStorage.removeItem('soporte_ticket');
    chatInput.disabled = true;
    chatInput.value = '';
    chatInput.placeholder = 'Este ticket ha sido resuelto y cerrado.';
    const sendBtn = document.getElementById('soporte-chat-send');
    if (sendBtn) sendBtn.disabled = true;
    if (escalateBar) escalateBar.style.display = 'none';
    agentStatus.textContent = 'Ticket cerrado';

    const div = document.createElement('div');
    div.className = 'soporte-msg system';
    div.style.cssText = 'background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:18px;text-align:center;margin-top:12px;border-radius:12px;max-width:90%;align-self:center;';

    div.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;font-size:15px;"><i class="fa fa-check-circle" style="color:#22c55e;"></i> Atención Finalizada</div>
      <div style="font-size:12.5px;margin-bottom:16px;color:#475569;">${escapeHtml(msg || 'El asesor ha finalizado la atención de esta solicitud.')}</div>

      <div id="rating-section" style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:10px;">⭐ ¿Cómo calificas la atención recibida?</div>
        <div id="stars-container" style="display:flex;justify-content:center;gap:8px;margin-bottom:12px;">
          ${[1,2,3,4,5].map(i => `
            <i class="fa-solid fa-star rating-star" data-val="${i}"
              style="font-size:32px;color:#cbd5e1;cursor:pointer;transition:transform 0.15s, color 0.15s;padding:2px;"
              title="${i} de 5 estrellas"></i>
          `).join('')}
        </div>
        <textarea id="rating-comment" placeholder="Comentario opcional..." rows="2"
          style="width:90%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:12.5px;resize:none;outline:none;margin-bottom:10px;"></textarea>
        <br>
        <button type="button" id="btn-enviar-rating"
          style="background:#1e3a8a;color:#fff;border:none;padding:9px 20px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa fa-paper-plane"></i> Enviar calificación
        </button>
      </div>

      <button type="button" id="btn-nuevo-ticket"
        style="background:#f1f5f9;color:#1e3a8a;border:1px solid #cbd5e1;padding:9px 18px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
        <i class="fa fa-plus-circle"></i> Abrir una nueva solicitud
      </button>
    `;

    chatMessages.appendChild(div);
    scrollToBottom();

    // ── Rating logic (Direct Event Listeners) ──
    let selectedRating = 0;
    const starEls = div.querySelectorAll('.rating-star');

    starEls.forEach((star) => {
      const val = parseInt(star.getAttribute('data-val'));

      star.addEventListener('mouseenter', () => {
        starEls.forEach((s, idx) => {
          s.style.color = (idx < val) ? '#f59e0b' : '#cbd5e1';
          s.style.transform = (idx < val) ? 'scale(1.2)' : 'scale(1)';
        });
      });

      star.addEventListener('mouseleave', () => {
        starEls.forEach((s, idx) => {
          s.style.color = (idx < selectedRating) ? '#f59e0b' : '#cbd5e1';
          s.style.transform = 'scale(1)';
        });
      });

      star.addEventListener('click', () => {
        selectedRating = val;
        starEls.forEach((s, idx) => {
          s.style.color = (idx < selectedRating) ? '#f59e0b' : '#cbd5e1';
        });
      });
    });

    const sendRatingBtn = div.querySelector('#btn-enviar-rating');
    if (sendRatingBtn) {
      sendRatingBtn.addEventListener('click', async () => {
        if (!selectedRating) {
          showNotif('Por favor selecciona de 1 a 5 estrellas haciendo clic sobre ellas.', 'warning');
          return;
        }

        const ticketId = activeTicketInfo.ticketId || activeTicketInfo.id;
        const sessionId = activeTicketInfo.sessionId || activeTicketInfo.session_id;

        const comentario = div.querySelector('#rating-comment').value.trim();
        const csrf = getCsrf();

        sendRatingBtn.disabled = true;
        sendRatingBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Enviando...';

        try {
          const r = await fetch('/api/soporte/calificar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(csrf ? { 'x-csrf-token': csrf } : {})
            },
            body: JSON.stringify({
              ticket_id: ticketId,
              session_id: sessionId,
              estrellas: selectedRating,
              comentario
            })
          });
          const data = await r.json();
          if (data.ok) {
            const stars = '⭐'.repeat(selectedRating);
            div.querySelector('#rating-section').innerHTML = `
              <div style="font-weight:700;color:#166534;font-size:14px;"><i class="fa fa-check-circle"></i> ¡Gracias por tu calificación!</div>
              <div style="font-size:24px;margin:8px 0;">${stars}</div>
              <div style="font-size:12.5px;color:#64748b;">${comentario ? escapeHtml(comentario) : ''}</div>
            `;
            showNotif('¡Calificación enviada con éxito!');

            // Redirigir automáticamente al formulario después de 2.5 segundos
            setTimeout(() => {
              resetToNewTicketForm();
            }, 2500);
          } else {
            sendRatingBtn.disabled = false;
            sendRatingBtn.innerHTML = '<i class="fa fa-paper-plane"></i> Enviar calificación';
            showNotif(data.error || 'Error al enviar calificación.', 'error');
          }
        } catch (e) {
          sendRatingBtn.disabled = false;
          sendRatingBtn.innerHTML = '<i class="fa fa-paper-plane"></i> Enviar calificación';
          showNotif('Error de conexión al enviar calificación.', 'error');
        }
      });
    }

    const newTicketBtn = div.querySelector('#btn-nuevo-ticket');
    if (newTicketBtn) {
      newTicketBtn.addEventListener('click', () => {
        resetToNewTicketForm();
      });
    }
  }

  function resetToNewTicketForm() {
    sessionStorage.removeItem('soporte_ticket');
    ticketData = null;
    
    // Desconectar el socket si estaba activo
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    chatInput.disabled = false;
    chatInput.value = '';
    chatInput.placeholder = 'Escribe tu mensaje...';
    const sendBtn = document.getElementById('soporte-chat-send');
    if (sendBtn) sendBtn.disabled = false;
    chatMessages.innerHTML = '';

    // Restablecer la barra superior del chat a los valores por defecto (Bot)
    if (agentName) agentName.textContent = 'Asistente Bot';
    if (agentStatus) agentStatus.textContent = 'En línea';
    if (agentAvatar) agentAvatar.innerHTML = '<i class="fa fa-robot"></i>';
    if (escalateBar) escalateBar.style.display = 'block';

    const btn = form.querySelector('.soporte-submit-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-arrow-right"></i> Iniciar conversación';
    }

    stepChat.classList.remove('active');
    stepForm.classList.add('active');
  }

  // ─── Helpers ───
  function appendMsg(rol, mensaje, remitente, fecha) {
    const div = document.createElement('div');
    div.className = `soporte-msg ${rol}`;

    const time = fecha
      ? new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let html = '';
    const imgMatch = (mensaje || '').match(/(?:\[IMAGEN\]\s*(\S+)|^(\/uploads\/soporte\/\S+))/i);
    if (imgMatch) {
      const url = imgMatch[1] || imgMatch[2];
      html = `
        <div style="margin-bottom:4px;">
          <a href="${escapeHtml(url)}" target="_blank" title="Ver imagen en tamaño completo">
            <img src="${escapeHtml(url)}" alt="Imagen adjunta" style="max-width:230px;max-height:230px;border-radius:10px;object-fit:cover;display:block;box-shadow:0 2px 8px rgba(0,0,0,0.15);" />
          </a>
        </div>
      `;
    } else {
      html = escapeHtml(mensaje)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '<br>• ')
        .replace(/\n/g, '<br>');
    }

    div.innerHTML = `
      <div>${html}</div>
      <div class="soporte-msg-meta">${escapeHtml(remitente || '')} • ${time}</div>
    `;
    chatMessages.appendChild(div);
  }

  function scrollToBottom() {
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getCsrf() {
    const el = document.getElementById('csrfToken');
    if (el) return el.value;
    const c = document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='));
    return c ? c.split('=')[1] : null;
  }

  // Notificación flotante (mismo estilo del proyecto)
  function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification show';
    if (type === 'error') {
      n.style.backgroundColor = '#c62828';
    } else if (type === 'warning') {
      n.style.backgroundColor = '#e65100';
    }
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => {
      n.classList.remove('show');
      setTimeout(() => n.remove(), 500);
    }, 3000);
  }
});
