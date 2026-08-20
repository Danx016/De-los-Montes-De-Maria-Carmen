import api from './axiosInstance'

export const listarProductos = () => api.get('/productos')

export const obtenerProducto = (id) => api.get(`/productos/${id}`)

export const buscarProductos = (q) =>
  api.get(`/productos/buscar?q=${encodeURIComponent(q)}`)

export const crearProducto = (formData) =>
  api.post('/productos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })

export const actualizarProducto = (id, formData) =>
  api.put(`/productos/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })

export const eliminarProducto = (id) => api.delete(`/productos/${id}`)

export const listarCategoriasPublicas = () => api.get('/productos/categorias')
