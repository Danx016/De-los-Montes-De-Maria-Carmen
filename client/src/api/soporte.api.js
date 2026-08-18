import api from './axiosInstance'

export const crearTicket = (data) => api.post('/soporte/crear-ticket', data)

export const enviarMensaje = (data) => api.post('/soporte/mensaje', data)

export const solicitarAgente = (data) => api.post('/soporte/solicitar-agente', data)

export const cerrarTicket = (data) => api.post('/soporte/cerrar-ticket', data)

export const calificar = (data) => api.post('/soporte/calificar', data)

export const buscarTicket = (params) => api.get('/soporte/buscar', { params })

export const subirImagen = (formData) =>
  api.post('/soporte/upload-imagen', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Admin
export const listarAgentes = () => api.get('/soporte/agentes')

export const asignarAgente = (data) =>
  api.post('/soporte/asignar-agente', data)

export const statsAgentes = () => api.get('/soporte/stats-agentes')

export const todasCalificaciones = () =>
  api.get('/soporte/todas-calificaciones')
