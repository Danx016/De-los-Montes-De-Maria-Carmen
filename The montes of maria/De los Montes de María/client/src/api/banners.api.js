import api from './axiosInstance'

export const listarBannersPublicos = () => api.get('/banners')

export const listarBannersAdmin = () => api.get('/banners/admin/all')

export const crearBannerAdmin = (formData) => {
  return api.post('/banners/admin', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const actualizarBannerAdmin = (id, formData) => {
  return api.put(`/banners/admin/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const eliminarBannerAdmin = (id) => api.delete(`/banners/admin/${id}`)
