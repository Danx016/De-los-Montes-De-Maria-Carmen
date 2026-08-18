import api from './axiosInstance'

export const validarCupon = (arg1, arg2) => {
  if (typeof arg1 === 'object' && arg1 !== null) {
    const codigo = arg1.codigo || arg1.code || ''
    const total = arg1.total !== undefined ? arg1.total : (arg1.monto_compra !== undefined ? arg1.monto_compra : 0)
    return api.post('/cupones/validar', { codigo, total, monto_compra: total })
  }
  return api.post('/cupones/validar', { codigo: arg1, total: arg2, monto_compra: arg2 })
}

export const listarCuponesPromocionales = () => api.get('/cupones/promocionales')

export const listarCuponesAdmin = () => api.get('/cupones/admin')

export const crearCuponAdmin = (data) => api.post('/cupones/admin', data)

export const actualizarCuponAdmin = (id, data) => api.put(`/cupones/admin/${id}`, data)

export const toggleCuponAdmin = (id) => api.patch(`/cupones/admin/${id}/toggle`)

export const togglePromocionCuponAdmin = (id) => api.patch(`/cupones/admin/${id}/toggle-promocion`)

export const eliminarCuponAdmin = (id) => api.delete(`/cupones/admin/${id}`)
