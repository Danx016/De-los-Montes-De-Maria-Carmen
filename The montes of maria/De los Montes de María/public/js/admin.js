// Obtener token JWT del usuario logueado y header CSRF para proteger las peticiones
function getAuthHeaders(isMultipart = false) {
  const user = JSON.parse(localStorage.getItem('user'));
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (user && user.token) {
    headers['Authorization'] = `Bearer ${user.token}`;
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  return headers;
}

function getCsrfToken() {
  const csrfInput = document.getElementById('csrfToken');
  if (csrfInput && csrfInput.value) {
    return csrfInput.value;
  }
  const cookieValue = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='));
  return cookieValue ? cookieValue.split('=')[1] : null;
}

// Helper para mostrar feedback premium en el loader global
function showLoaderState(state, message, duration = 2200, callback = null) {
  const loader = document.getElementById('global-loader');
  const loaderIcon = document.getElementById('loader-icon');
  const loaderText = document.getElementById('loader-text');
  
  if (!loader) return;
  
  loader.style.display = 'flex';
  
  if (state === 'loading') {
    if (loaderIcon) {
      loaderIcon.className = 'fa fa-spinner fa-spin fa-3x';
      loaderIcon.style.color = '#374151';
    }
    if (loaderText) {
      loaderText.textContent = message;
      loaderText.style.color = '';
    }
  } else if (state === 'success') {
    if (loaderIcon) {
      loaderIcon.className = 'fa-solid fa-circle-check fa-3x';
      loaderIcon.style.color = '#2D6A4F';
    }
    if (loaderText) {
      loaderText.textContent = message;
      loaderText.style.color = '#2D6A4F';
    }
    setTimeout(() => {
      loader.style.display = 'none';
      if (callback) callback();
    }, duration);
  } else if (state === 'error') {
    if (loaderIcon) {
      loaderIcon.className = 'fa-solid fa-circle-xmark fa-3x';
      loaderIcon.style.color = '#DC2626';
    }
    if (loaderText) {
      loaderText.textContent = message;
      loaderText.style.color = '#DC2626';
    }
    setTimeout(() => {
      loader.style.display = 'none';
      if (callback) callback();
    }, duration);
  }
}

// Basic HTML escaper to prevent XSS (OWASP A03/A05)
const escapeHTML = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Etiquetas de categorías
const CAT_LABELS = {
  semillas: '&#127807; Semillas del Valle',
  lacteos: '&#128004; Lácteos La Finca',
  abonos: '&#127810; Abonos Natura',
  ferre: '&#128296; Ferre Campo',
  cosechas: '&#127807; Cosechas del Sol',
  agro: '&#128663; AgroEquipos'
};

// Cargar productos y mostrarlos en la tabla
async function cargarProductos() {
  try {
    const res = await fetch('/api/admin/productos', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const productos = await res.json();
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    productos.forEach(producto => {
      const catLabel = CAT_LABELS[producto.categoria] || '<span style="color:#94a3b8;">Sin sección</span>';
    
    // Lógica para Disponibilidad y Estado visual de la fila
    let dispBadge = '';
    let dispText = producto.disponibilidad || 'No especificada';
    let rowOpacity = '1';
    let rowBg = '';
    const numDisp = parseInt(dispText, 10);
    
    if (dispText.toLowerCase().includes("sin") || dispText.toLowerCase().includes("agotado")) {
      dispBadge = '<span style="background:#ef4444;color:white;padding:3px 8px;border-radius:6px;font-size:0.85em;font-weight:bold;"><i class="fa fa-ban"></i> Agotado</span>';
      rowOpacity = '0.6';
      rowBg = 'background-color: #fef2f2;';
    } else if (!isNaN(numDisp)) {
      if (numDisp <= 0) {
        dispBadge = '<span style="background:#ef4444;color:white;padding:3px 8px;border-radius:6px;font-size:0.85em;font-weight:bold;"><i class="fa fa-ban"></i> Agotado</span>';
        rowOpacity = '0.6';
        rowBg = 'background-color: #fef2f2;';
      } else if (numDisp <= 5) {
        dispBadge = `<span style="background:#f59e0b;color:white;padding:3px 8px;border-radius:6px;font-size:0.85em;font-weight:bold;"><i class="fa fa-exclamation-triangle"></i> Quedan ${numDisp}</span>`;
      } else {
        dispBadge = `<span style="background:#10b981;color:white;padding:3px 8px;border-radius:6px;font-size:0.85em;font-weight:bold;">${numDisp} uds.</span>`;
      }
    } else {
      dispBadge = `<span style="color:#64748b;font-size:0.9em;font-weight:600;">${escapeHTML(dispText)}</span>`;
    }

    const tr = document.createElement('tr');
    tr.style.cssText = `${rowBg} opacity: ${rowOpacity}; transition: all 0.3s;`;
    tr.innerHTML = `
      <td>${escapeHTML(producto.id_producto)}</td>
      <td><strong>${escapeHTML(producto.nombre_producto)}</strong></td>
      <td style="font-weight: bold; color: #10b981;">$${parseFloat(producto.precio).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
      <td><span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:0.82em;font-weight:600;">${catLabel}</span></td>
      <td style="text-align: center;">${dispBadge}</td>
      <td><img src="${escapeHTML(producto.imagen)}" alt="img" style="max-width:55px; border-radius:6px;" /></td>
      <td>
        <button class="edit-btn" data-id="${escapeHTML(producto.id_producto)}">Editar</button>
        <button class="delete-btn" data-id="${escapeHTML(producto.id_producto)}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error al cargar productos:", error);
    const tbody = document.getElementById('products-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al obtener productos de la base de datos.</td></tr>';
    }
  }
}

// Al hacer click en editar, carga los datos en el formulario
const productsTableBody = document.getElementById('products-table-body');
if (productsTableBody) {
  productsTableBody.addEventListener('click', async function(e) {
    if (e.target.classList.contains('edit-btn')) {
      const id = e.target.dataset.id;
      const res = await fetch(`/api/admin/productos/${id}`, { cache: 'no-store' });
      const producto = await res.json();
      document.getElementById('product-id').value = producto.id_producto;
      document.getElementById('product-name').value = producto.nombre_producto;
      document.getElementById('product-price').value = Math.round(parseFloat(producto.precio)).toLocaleString('es-CO');
      document.getElementById('product-img').value = producto.imagen;
      if (productFileInput) productFileInput.value = '';
      document.getElementById('product-desc').value = producto.descripcion || '';
      document.getElementById('product-categoria').value = producto.categoria || '';
      document.getElementById('product-origen').value = producto.origen || '';
      document.getElementById('product-presentacion').value = producto.presentacion || '';
      document.getElementById('product-cuidado').value = producto.cuidado || '';
      document.getElementById('product-disponibilidad').value = producto.disponibilidad || '';
      document.getElementById('preview-img').src = producto.imagen;
      document.getElementById('preview-img').style.display = 'block';
      const formEl = document.getElementById('product-form');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
    }
    // Eliminar producto (con autenticación)
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      if (await confirm('¿Seguro que deseas eliminar este producto?')) {
        showLoaderState('loading', 'Eliminando producto...');
        try {
          const res = await fetch(`/api/admin/productos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          if (res.ok) {
            await cargarProductos();
            showLoaderState('success', '¡Producto eliminado con éxito!');
          } else {
            const data = await res.json();
            showLoaderState('error', data.message || 'Error al eliminar. Verifica tus permisos.');
          }
        } catch (err) {
          showLoaderState('error', 'Error de red al intentar eliminar el producto.');
        }
      }
    }
  });
}

// Guardar (crear o actualizar) producto (con autenticación)
const productFileInput = document.getElementById('product-file');
const productImageInput = document.getElementById('product-img');
const previewImage = document.getElementById('preview-img');

function updateProductPreview() {
  if (!previewImage) return;
  if (productFileInput && productFileInput.files && productFileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImage.src = e.target.result;
      previewImage.style.display = 'block';
    };
    reader.readAsDataURL(productFileInput.files[0]);
    const fileLabel = document.getElementById('product-file-label');
    if (fileLabel) fileLabel.textContent = productFileInput.files[0].name;
  } else if (productImageInput && productImageInput.value.trim() !== '') {
    previewImage.src = productImageInput.value.trim();
    previewImage.style.display = 'block';
  } else {
    previewImage.style.display = 'none';
  }
}

if (productFileInput) {
  productFileInput.addEventListener('change', updateProductPreview);
}
if (productImageInput) {
  productImageInput.addEventListener('input', updateProductPreview);
}

async function submitProductForm(id, formData) {
  const url = id ? `/api/admin/productos/${id}` : '/api/admin/productos';
  const method = id ? 'PUT' : 'POST';
  return await fetch(url, {
    method,
    headers: getAuthHeaders(true),
    body: formData
  });
}

const productForm = document.getElementById('product-form');
if (productForm) {
  productForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const nombre = document.getElementById('product-name').value;
    const rawPrecio = document.getElementById('product-price').value;
    const precio = rawPrecio.replace(/[^\d]/g, '');
    const imagen = document.getElementById('product-img').value.trim();
    const descripcion = document.getElementById('product-desc').value;
    const categoria = document.getElementById('product-categoria').value;
    const origen = document.getElementById('product-origen').value;
    const presentacion = document.getElementById('product-presentacion').value;
    const cuidado = document.getElementById('product-cuidado').value;
    const disponibilidad = document.getElementById('product-disponibilidad').value;

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('precio', precio);
    formData.append('descripcion', descripcion);
    formData.append('categoria', categoria);
    formData.append('origen', origen);
    formData.append('presentacion', presentacion);
    formData.append('cuidado', cuidado);
    formData.append('disponibilidad', disponibilidad);
    if (imagen) {
      formData.append('imagen', imagen);
    }
    if (productFileInput && productFileInput.files[0]) {
      formData.append('imageFile', productFileInput.files[0]);
    }

  showLoaderState('loading', id ? 'Actualizando producto...' : 'Creando producto...');
  try {
    const res = await submitProductForm(id, formData);
    if (res.ok) {
      await cargarProductos();
      document.getElementById('product-form').reset();
      previewImage.style.display = 'none';
      const labelSpan = document.getElementById('product-file-label');
      if (labelSpan) labelSpan.textContent = 'Seleccionar Archivo';
      showLoaderState('success', id ? '¡Producto actualizado con éxito!' : '¡Producto creado con éxito!');
    } else {
      const data = await res.json();
      showLoaderState('error', data.message || (id ? 'Error al actualizar. Verifica tus permisos.' : 'Error al crear. Verifica tus permisos.'));
    }
  } catch (err) {
    showLoaderState('error', 'Error de red al procesar el producto.');
  }
  });
}

// Llamado inicial para cargar productos, usuarios y compras al abrir el panel
try {
  cargarProductos();
  cargarUsuarios();
  cargarCompras();
} catch (err) {
  console.error("Error en la carga inicial:", err);
}

// ========== SECCIÓN DE GESTIÓN DE USUARIOS ==========

// Cargar usuarios y mostrarlos en la tabla
async function cargarUsuarios() {
  try {
    const res = await fetch('/api/admin/usuarios', {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    if (res.status === 401 || res.status === 403) {
      const tbody = document.getElementById('users-table-body');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #d97706; padding: 20px; font-weight: 600;">⚠️ Sesión expirada o no autorizada. Por favor <a href="/login" style="color: #2d5c88; text-decoration: underline; font-weight: bold;">inicia sesión de nuevo</a> como Administrador.</td></tr>';
      }
      return;
    }
    if (!res.ok) throw new Error("Error al obtener usuarios");
    
    const usuarios = await res.json();
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    usuarios.forEach(usuario => {
      const tr = document.createElement('tr');
      let rolStr = 'Usuario Común';
      if (usuario.id_rol === 1) rolStr = '<span style="background-color: #2d5c88; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">Admin</span>';
      else if (usuario.id_rol === 2) rolStr = '<span style="background-color: #10b981; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">Vendedor</span>';
      
      tr.innerHTML = `
        <td>${escapeHTML(usuario.id_usuario)}</td>
        <td>${escapeHTML(usuario.nombre)}</td>
        <td>${escapeHTML(usuario.apodo)}</td>
        <td>${escapeHTML(usuario.correo)}</td>
        <td>${rolStr}</td>
        <td>
          <button class="edit-user-btn" data-id="${escapeHTML(usuario.id_usuario)}" style="padding: 6px 12px; background-color: #2d5c88; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold; margin-right: 5px;">Editar</button>
          <button class="delete-user-btn" data-id="${escapeHTML(usuario.id_usuario)}" style="padding: 6px 12px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold;">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    const tbody = document.getElementById('users-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar usuarios de la base de datos.</td></tr>';
    }
  }
}

// Cargar usuario para edición al hacer clic en Editar
const usersTableBody = document.getElementById('users-table-body');
if (usersTableBody) {
  usersTableBody.addEventListener('click', async function(e) {
    if (e.target.classList.contains('edit-user-btn')) {
      const id = e.target.dataset.id;
      try {
        const res = await fetch(`/api/admin/usuarios/${id}`, {
          headers: getAuthHeaders(),
          cache: 'no-store'
        });
        if (res.ok) {
          const usuario = await res.json();
          document.getElementById('user-id').value = usuario.id_usuario;
          document.getElementById('user-name').value = usuario.nombre;
          document.getElementById('user-apodo').value = usuario.apodo;
          document.getElementById('user-email').value = usuario.correo;
          document.getElementById('user-role').value = usuario.id_rol === 1 ? '1' : (usuario.id_rol === 2 ? '2' : 'null');
          document.getElementById('user-password').value = '';
          
          // Hacer scroll suave al formulario de edición
          document.getElementById('user-form').scrollIntoView({ behavior: 'smooth' });
        }
      } catch (error) {
        showLoaderState('error', 'Error al cargar detalles del usuario');
      }
    }
    
    // Eliminar usuario
    if (e.target.classList.contains('delete-user-btn')) {
      const id = e.target.dataset.id;
      if (await confirm('¿Seguro que deseas eliminar este usuario permanentemente?')) {
        showLoaderState('loading', 'Eliminando usuario...');
        try {
          const res = await fetch(`/api/admin/usuarios/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          if (res.ok) {
            await cargarUsuarios();
            showLoaderState('success', 'Usuario eliminado correctamente');
          } else {
            const data = await res.json();
            showLoaderState('error', data.error || 'Error al eliminar usuario. No puedes eliminar tu propia cuenta.');
          }
        } catch (error) {
          showLoaderState('error', 'Error de conexión al eliminar usuario');
        }
      }
    }
  });
}

// Guardar cambios del usuario
const userForm = document.getElementById('user-form');
if (userForm) {
  userForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('user-id').value;
    const nombre = document.getElementById('user-name').value;
    const apodo = document.getElementById('user-apodo').value;
    const correo = document.getElementById('user-email').value;
    const id_role_value = document.getElementById('user-role').value;
    const contrasena = document.getElementById('user-password').value;

    if (!id) {
      showLoaderState('error', 'Por favor selecciona un usuario de la lista para editar.');
      return;
    }
 
    const payload = { 
      nombre, 
      apodo, 
      correo, 
      id_rol: id_role_value === '1' ? 1 : (id_role_value === '2' ? 2 : null), 
      contrasena 
    };
 
    showLoaderState('loading', 'Actualizando usuario...');
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await cargarUsuarios();
        userForm.reset();
        document.getElementById('user-id').value = '';
        showLoaderState('success', 'Usuario actualizado correctamente');
      } else {
        const data = await res.json();
        showLoaderState('error', data.error || 'Error al actualizar el usuario');
      }
    } catch (error) {
      showLoaderState('error', 'Error de red al actualizar el usuario');
    }
  });
}

// Botón de Cancelar Edición de Usuario
const btnCancelUserEdit = document.getElementById('btn-cancel-user-edit');
if (btnCancelUserEdit) {
  btnCancelUserEdit.addEventListener('click', () => {
    if (userForm) userForm.reset();
    document.getElementById('user-id').value = '';
  });
}

// ========== SECCIÓN DE GESTIÓN DE COMPRAS ==========

// Lista máster de los 14 estados para el panel de administración
const ADMIN_ORDER_STATUSES = [
  "Pedido recibido",
  "Pago confirmado",
  "Pedido en preparación",
  "Pedido empacado",
  "Pedido enviado",
  "Producto en tránsito",
  "Producto llegó a centro logístico",
  "Pedido en ruta de entrega",
  "Entrega exitosa",
  "Entrega fallida",
  "Retraso en envío",
  "Producto cancelado",
  "Devolución iniciada",
  "Reembolso procesado"
];

const ADMIN_STATUS_MAP = {
  "Pedido recibido":                    { icon: "fa-receipt",              color: "#3b82f6", bg: "#eff6ff" },
  "Pago confirmado":                    { icon: "fa-circle-check",         color: "#10b981", bg: "#f0fdf4" },
  "Pedido en preparación":              { icon: "fa-box-open",             color: "#f59e0b", bg: "#fffbeb" },
  "Pedido empacado":                    { icon: "fa-box",                  color: "#6366f1", bg: "#eef2ff" },
  "Pedido enviado":                     { icon: "fa-truck-ramp-box",       color: "#06b6d4", bg: "#ecfeff" },
  "Producto en tránsito":               { icon: "fa-truck",                color: "#0284c7", bg: "#f0f9ff" },
  "Producto llegó a centro logístico": { icon: "fa-warehouse",            color: "#db2777", bg: "#fdf2f8" },
  "Pedido en ruta de entrega":          { icon: "fa-motorcycle",           color: "#ca8a04", bg: "#fefce8" },
  "Entrega exitosa":                    { icon: "fa-house-circle-check",   color: "#10b981", bg: "#f0fdf4" },
  "Entrega fallida":                    { icon: "fa-triangle-exclamation", color: "#ef4444", bg: "#fef2f2" },
  "Retraso en envío":                   { icon: "fa-clock",                color: "#f97316", bg: "#fff7ed" },
  "Producto cancelado":                 { icon: "fa-circle-xmark",         color: "#64748b", bg: "#f8fafc" },
  "Devolución iniciada":                { icon: "fa-rotate-left",          color: "#a855f7", bg: "#faf5ff" },
  "Reembolso procesado":                { icon: "fa-hand-holding-dollar",  color: "#14b8a6", bg: "#f0fdfa" }
};

const STATUS_COLORS = {
  "Pedido recibido": { color: "#3b82f6", bg: "#eff6ff" },
  "Pago confirmado": { color: "#10b981", bg: "#f0fdf4" },
  "Pedido en preparación": { color: "#f59e0b", bg: "#fffbeb" },
  "Pedido empacado": { color: "#6366f1", bg: "#eef2ff" },
  "Pedido enviado": { color: "#06b6d4", bg: "#ecfeff" },
  "Producto en tránsito": { color: "#0284c7", bg: "#f0f9ff" },
  "Producto llegó a centro logístico": { color: "#db2777", bg: "#fdf2f8" },
  "Pedido en ruta de entrega": { color: "#ca8a04", bg: "#fefce8" },
  "Entrega exitosa": { color: "#10b981", bg: "#f0fdf4" },
  "Entrega fallida": { color: "#ef4444", bg: "#fef2f2" },
  "Retraso en envío": { color: "#f97316", bg: "#fff7ed" },
  "Producto cancelado": { color: "#64748b", bg: "#f8fafc" },
  "Devolución iniciada": { color: "#a855f7", bg: "#faf5ff" },
  "Reembolso procesado": { color: "#14b8a6", bg: "#f0fdfa" }
};

// Cargar compras y mostrarlas en la tabla
async function cargarCompras() {
  try {
    const res = await fetch('/api/admin/compras', {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    if (res.status === 401 || res.status === 403) {
      const tbody = document.getElementById('orders-table-body');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #d97706; padding: 20px; font-weight: 600;">⚠️ Sesión expirada o no autorizada. Por favor <a href="/login" style="color: #2d5c88; text-decoration: underline; font-weight: bold;">inicia sesión de nuevo</a> como Administrador.</td></tr>';
      }
      return;
    }
    if (!res.ok) throw new Error("Error al obtener compras globales");

    const compras = await res.json();
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (compras.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">No hay compras registradas en el sistema.</td></tr>';
      return;
    }

    compras.forEach(compra => {
      const tr = document.createElement('tr');
      const totalFloat = parseFloat(compra.total).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const fechaStr = new Date(compra.fecha).toLocaleString();

      // Normalizar el estado actual para que coincida con la lista del admin
      let currentStatus = compra.estado || "Pedido recibido";
      if (currentStatus === "Pendiente") currentStatus = "Pedido recibido";
      if (currentStatus === "Despachado") currentStatus = "Pedido enviado";

      let optionsHtml = "";
      ADMIN_ORDER_STATUSES.forEach(statusOpt => {
        const isSelected = statusOpt.toLowerCase() === currentStatus.toLowerCase() ? "selected" : "";
        optionsHtml += `<option value="${statusOpt}" ${isSelected}>${statusOpt}</option>`;
      });

      const stat = STATUS_COLORS[currentStatus] || { color: "#1e293b", bg: "#f8fafc" };

      tr.innerHTML = `
        <td>#${escapeHTML(compra.id_compra)}</td>
        <td><strong>${escapeHTML(compra.nombre_usuario)}</strong></td>
        <td>${escapeHTML(compra.correo)}</td>
        <td>${fechaStr}</td>
        <td><strong style="color: #2e7d32;">$${totalFloat}</strong></td>
        <td>
          <select class="change-order-status-select" data-id="${escapeHTML(compra.id_compra)}" style="padding: 6px 12px; border-radius: 20px; border: 1.5px solid #cbd5e1; background-color: white; font-weight: 700; cursor: pointer; color: #1e293b; font-size: 0.85em; outline: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); min-width: 160px;">
            ${optionsHtml}
          </select>
        </td>
        <td>
          <button class="delete-order-btn" data-id="${escapeHTML(compra.id_compra)}" style="padding: 6px 12px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
            <i class="fa fa-trash"></i> Eliminar
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Asignar listeners de cambio de estado a todos los selects
    document.querySelectorAll(".change-order-status-select").forEach(select => {
      select.addEventListener("change", async function() {
        const idCompra = this.dataset.id;
        const nuevoEstado = this.value;
        
        showLoaderState('loading', `Actualizando estado del pedido #${idCompra} a "${nuevoEstado}"...`);
        try {
          const res = await fetch(`/api/compra/${idCompra}/estado`, {
            method: 'PUT',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: nuevoEstado })
          });
          
          if (res.ok) {
            showLoaderState('success', `El estado del pedido #${idCompra} ahora es: "${nuevoEstado}"`);
            // Actualizar el color del select al nuevo estado
            const newStat = STATUS_COLORS[nuevoEstado] || { color: "#1e293b", bg: "#f8fafc" };
            this.style.color = newStat.color;
            this.style.backgroundColor = newStat.bg;
            this.style.borderColor = newStat.color;
          } else {
            const data = await res.json();
            showLoaderState('error', data.error || 'Error al actualizar el estado del pedido.');
            // Restaurar estado cargándolo de nuevo
            cargarCompras();
          }
        } catch (error) {
          console.error("Error al actualizar el estado del pedido:", error);
          showLoaderState('error', 'Error de red al intentar actualizar el estado.');
          cargarCompras();
        }
      });
    });

  } catch (error) {
    console.error("Error al cargar compras globales:", error);
    const tbody = document.getElementById('orders-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar el historial global de compras.</td></tr>';
    }
  }
}

// Escuchar eliminación de compras en el cuerpo de la tabla
const ordersTableBody = document.getElementById('orders-table-body');
if (ordersTableBody) {
  ordersTableBody.addEventListener('click', async function (e) {
    const btn = e.target.closest('.delete-order-btn');
    if (btn) {
      const id = btn.dataset.id;
      if (await confirm(`¿Está seguro que desea eliminar de forma permanente el registro de la compra #${id}? Esta acción no se puede deshacer y eliminará también el desglose de productos asociados.`)) {
        showLoaderState('loading', 'Eliminando compra de la base de datos...');
        try {
          const res = await fetch(`/api/admin/compras/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          if (res.ok) {
            await cargarCompras();
            showLoaderState('success', 'Compra y sus detalles eliminados correctamente del sistema');
          } else {
            const data = await res.json();
            showLoaderState('error', data.error || 'Error al eliminar la compra.');
          }
        } catch (error) {
          showLoaderState('error', 'Error de red al intentar eliminar la compra.');
        }
      }
    }
  });
}

// ========== MANEJO DE PESTAÑAS (TABS) DEL ADMINISTRADOR ==========
const tabProducts = document.getElementById('tab-products');
const tabUsers = document.getElementById('tab-users');
const tabCalificaciones = document.getElementById('tab-calificaciones');
const tabOrders = document.getElementById('tab-orders');
const tabStats = document.getElementById('tab-stats');
const tabSoporte = document.getElementById('tab-soporte');

const sectionProducts = document.getElementById('section-products');
const sectionUsers = document.getElementById('section-users');
const sectionOrders = document.getElementById('section-orders');
const sectionStats = document.getElementById('section-stats');
const sectionCalificaciones = document.getElementById('section-calificaciones');
const sectionSoporte = document.getElementById('section-soporte');

function switchAdminTab(activeTab, activeSection) {
  const tabs = [tabProducts, tabUsers, tabOrders, tabStats, tabCalificaciones, tabSoporte];
  const sections = [sectionProducts, sectionUsers, sectionOrders, sectionStats, sectionCalificaciones, sectionSoporte];

  tabs.forEach(tab => {
    if (!tab) return;
    if (tab === activeTab) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
    tab.style.borderBottom = '';
    tab.style.color = '';
  });

  sections.forEach(sec => {
    if (!sec) return;
    sec.style.display = sec === activeSection ? 'block' : 'none';
  });
}

if (tabProducts) {
  tabProducts.addEventListener('click', () => {
    switchAdminTab(tabProducts, sectionProducts);
  });
}

if (tabUsers) {
  tabUsers.addEventListener('click', () => {
    switchAdminTab(tabUsers, sectionUsers);
    cargarUsuarios();
  });
}

if (tabOrders) {
  tabOrders.addEventListener('click', () => {
    switchAdminTab(tabOrders, sectionOrders);
    cargarCompras();
  });
}

if (tabCalificaciones) {
  tabCalificaciones.addEventListener('click', () => {
    switchAdminTab(tabCalificaciones, sectionCalificaciones);
  });
}

if (tabSoporte) {
  tabSoporte.addEventListener('click', () => {
    switchAdminTab(tabSoporte, sectionSoporte);
  });
}

let chartBarInst = null;
let chartPieInst = null;

function renderCharts(productosCat, usuariosRol) {
  if (typeof Chart === 'undefined') return;

  // 1. Gráfico de Barras: Productos por Sección
  const ctxBar = document.getElementById('chart-bar-productos');
  if (ctxBar) {
    const catLabels = {
      semillas: 'Semillas',
      lacteos: 'Lácteos',
      abonos: 'Abonos',
      ferre: 'Ferre Campo',
      cosechas: 'Cosechas',
      agro: 'AgroEquipos'
    };

    const labels = (productosCat || []).map(p => catLabels[p.categoria] || p.categoria);
    const dataVals = (productosCat || []).map(p => p.cantidad);

    if (chartBarInst) chartBarInst.destroy();

    chartBarInst = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['Semillas', 'Lácteos', 'Cosechas'],
        datasets: [{
          label: 'Cantidad de Productos',
          data: dataVals.length > 0 ? dataVals : [0, 0, 0],
          backgroundColor: [
            '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899'
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // 2. Gráfico Circular (Doughnut): Usuarios por Rol
  const ctxPie = document.getElementById('chart-pie-usuarios');
  if (ctxPie) {
    const rolesMap = {
      '1': 'Administradores',
      '2': 'Despachadores',
      '4': 'Agentes Soporte',
      'null': 'Clientes Comunes',
      '': 'Clientes Comunes'
    };

    const labels = [];
    const dataVals = [];

    (usuariosRol || []).forEach(r => {
      const key = String(r.id_rol);
      labels.push(rolesMap[key] || 'Clientes Comunes');
      dataVals.push(r.cantidad);
    });

    if (chartPieInst) chartPieInst.destroy();

    chartPieInst = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Clientes Comunes', 'Administradores'],
        datasets: [{
          data: dataVals.length > 0 ? dataVals : [1, 0],
          backgroundColor: [
            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

// ========== ESTADÍSTICAS GLOBALES ==========
async function cargarEstadisticas() {
  const btnRefresh = document.getElementById('btn-refresh-stats');
  if (btnRefresh) {
    btnRefresh.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Cargando...';
    btnRefresh.disabled = true;
  }
  
  try {
    const res = await fetch('/api/admin/estadisticas', {
      headers: getAuthHeaders()
    });
    
    if (res.ok) {
      const data = await res.json();
      
      // Animar los números
      animarNumero(document.getElementById('stat-revenue'), data.ingresos, true);
      animarNumero(document.getElementById('stat-orders'), data.ventas, false);
      animarNumero(document.getElementById('stat-users'), data.usuarios, false);
      animarNumero(document.getElementById('stat-products'), data.productos, false);

      // Renderizar gráficos de barras y circular
      renderCharts(data.productosCat, data.usuariosRol);
    }
  } catch (error) {
    console.error("Error al cargar estadísticas:", error);
  } finally {
    if (btnRefresh) {
      btnRefresh.innerHTML = '<i class="fa fa-sync-alt"></i> Actualizar Estadísticas';
      btnRefresh.disabled = false;
    }
  }
}

function animarNumero(elemento, valorFinal, esMoneda = false) {
  if (!elemento) return;
  const duracion = 1000;
  const fps = 30;
  const pasos = duracion / (1000 / fps);
  const incremento = valorFinal / pasos;
  let actual = 0;
  let pasoActual = 0;
  
  const timer = setInterval(() => {
    actual += incremento;
    pasoActual++;
    
    if (pasoActual >= pasos) {
      actual = valorFinal;
      clearInterval(timer);
    }
    
    elemento.textContent = esMoneda 
      ? `$${actual.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
      : Math.floor(actual).toLocaleString('es-CO');
  }, 1000 / fps);
}

if (tabStats) {
  tabStats.addEventListener('click', () => {
    switchAdminTab(tabStats, sectionStats);
    cargarEstadisticas();
  });
}

const btnRefreshStats = document.getElementById('btn-refresh-stats');
if (btnRefreshStats) {
  btnRefreshStats.addEventListener('click', cargarEstadisticas);
}

// ========== AUTO-REFRESH AUTOMÁTICO DEL PANEL ==========
// Refresca los datos de la sección activa cada 30 segundos
const AUTO_REFRESH_INTERVAL_MS = 30000;

function getActiveSection() {
  if (sectionOrders && sectionOrders.style.display === 'block') return 'orders';
  if (sectionUsers && sectionUsers.style.display === 'block') return 'users';
  if (sectionStats && sectionStats.style.display === 'block') return 'stats';
  return 'products'; // pestaña por defecto
}

function autoRefreshPanel() {
  const active = getActiveSection();
  try {
    if (active === 'products' && typeof cargarProductos === 'function') {
      cargarProductos();
    } else if (active === 'users' && typeof cargarUsuarios === 'function') {
      cargarUsuarios();
    } else if (active === 'orders' && typeof cargarCompras === 'function') {
      cargarCompras();
    } else if (active === 'stats' && typeof cargarEstadisticas === 'function') {
      cargarEstadisticas();
    }
  } catch (e) {
    console.warn('[AutoRefresh] Error al refrescar panel:', e);
  }
}

// Indicador visual sutil de última actualización
function updateLastRefreshBadge() {
  const badge = document.getElementById('admin-last-refresh');
  if (badge) {
    const now = new Date();
    badge.textContent = `Actualizado: ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}

setInterval(() => {
  autoRefreshPanel();
  updateLastRefreshBadge();
}, AUTO_REFRESH_INTERVAL_MS);

// Carga inicial inmediata de datos al cargar el script
document.addEventListener('DOMContentLoaded', () => {
  if (typeof cargarProductos === 'function') cargarProductos();
  if (typeof cargarUsuarios === 'function') cargarUsuarios();
  if (typeof cargarCompras === 'function') cargarCompras();
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (typeof cargarProductos === 'function') cargarProductos();
  if (typeof cargarUsuarios === 'function') cargarUsuarios();
  if (typeof cargarCompras === 'function') cargarCompras();
}