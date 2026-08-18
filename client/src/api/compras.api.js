import api from './axiosInstance'

export const crearCompra = (data) => api.post('/compra', data)

export const obtenerCreditos = () => api.get('/compra/creditos')

export const wompiFirma = (data) => api.post('/compra/wompi-firma', data)
export const crearStripeIntent = (data) => api.post('/compra/stripe-intent', data)

export const historialUsuario = (idUsuario) =>
  api.get(`/compra/usuario/${idUsuario}`)

export const obtenerRecibo = (idCompra) =>
  api.get(`/compra/recibo/${idCompra}`)

export const enviarReciboCorreo = (data) =>
  api.post('/compra/enviar-correo', data)

export const enviarOtp = (data) => api.post('/compra/enviar-otp', data)

export const verificarOtp = (data) => api.post('/compra/verificar-otp', data)

export const actualizarEstadoDespacho = (idCompra, data) =>
  api.put(`/compra/${idCompra}/estado`, data)

export const listarTodasVendedor = () => api.get('/compra/todas')
