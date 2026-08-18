import api from './axiosInstance'

export const obtenerEstadisticas = () => api.get('/admin/estadisticas')

export const listarUsuarios = () => api.get('/admin/usuarios')
export const crearUsuarioAdmin = (data) => api.post('/admin/usuarios', data)
export const obtenerUsuarioPorId = (id) => api.get(`/admin/usuarios/${id}`)

export const actualizarUsuario = (id, data) =>
  api.put(`/admin/usuarios/${id}`, data)

export const eliminarUsuario = (id) => api.delete(`/admin/usuarios/${id}`)

export const listarComprasGlobales = () => api.get('/admin/compras')

export const eliminarCompra = (id) => api.delete(`/admin/compras/${id}`)

// Inventario Global (CRUD Admin con fotos)
export const listarProductosAdmin = () => api.get('/admin/productos')

export const crearProductoAdmin = (formData) =>
  api.post('/admin/productos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const actualizarProductoAdmin = (id, formData) =>
  api.put(`/admin/productos/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const eliminarProductoAdmin = (id) => api.delete(`/admin/productos/${id}`)

// Categorías (CRUD Real con imágenes)
export const listarCategoriasAdmin = () => api.get('/admin/categorias')

export const crearCategoriaAdmin = (data) =>
  api.post('/admin/categorias', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const actualizarCategoriaAdmin = (id, data) =>
  api.put(`/admin/categorias/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const eliminarCategoriaAdmin = (id) => api.delete(`/admin/categorias/${id}`)

export const chatIA = (data) => api.post('/admin/ia-chat', data)
