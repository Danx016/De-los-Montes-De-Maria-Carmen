import api from './axiosInstance'

export const getMe = () => api.get('/user/me')

export const convertirseEnVendedor = (data = {}) => api.post('/user/convertir-vendedor', data)

export const actualizarPerfil = (id, data) => api.put(`/user/${id}`, data)

export const eliminarCuenta = (id) => api.delete(`/user/${id}`)

export const listarDirecciones = (id) => api.get(`/user/${id}/direcciones`)

export const agregarDireccion = (id, data) =>
  api.post(`/user/${id}/direcciones`, data)

export const actualizarDireccion = (id, idDir, data) =>
  api.put(`/user/${id}/direcciones/${idDir}`, data)

export const eliminarDireccion = (id, idDir) =>
  api.delete(`/user/${id}/direcciones/${idDir}`)

export const subirAvatar = (id, file) => {
  const formData = new FormData()
  formData.append('avatar', file)
  return api.post(`/user/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const subirPortada = (id, file) => {
  const formData = new FormData()
  formData.append('foto_portada', file)
  return api.post(`/user/${id}/portada`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const obtenerPerfilVendedor = (id) => api.get(`/user/vendedor/${id}`)

export const listarVendedores = () => api.get('/user/vendedores')
