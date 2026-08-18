import api from './axiosInstance'

export const chatPublico = (data) => {
  const payload = typeof data === 'string' ? { message: data } : { message: data.mensaje || data.message || '', history: data.history || [] }
  return api.post('/chat/public', payload)
}
