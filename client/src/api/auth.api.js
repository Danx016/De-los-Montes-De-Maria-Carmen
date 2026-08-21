import api from './axiosInstance'

export const login = (correo, contrasena) =>
  api.post('/auth/login', { username: correo, password: contrasena })

export const loginGoogle = (tokenOrCredential) => {
  const credential = typeof tokenOrCredential === 'object' && tokenOrCredential !== null
    ? (tokenOrCredential.credential || tokenOrCredential.token || '')
    : tokenOrCredential
  return api.post('/auth/login/google', { credential, token: credential })
}

export const register = (data) =>
  api.post('/auth/register', {
    name: data.nombre,
    apodo: data.apodo,
    email: data.correo,
    password: data.contrasena,
    confirmPassword: data.confirmarContrasena || data.contrasena,
    terms: true,
  })

export const checkUsername = (username) =>
  api.get(`/auth/check-username?username=${encodeURIComponent(username)}`)

export const requestRecover = (correo) =>
  api.post('/auth/recover/request', { email: correo })

export const resetPassword = (data) =>
  api.post('/auth/recover/reset', {
    email: data.email,
    code: data.code,
    newPassword: data.newPassword
  })

export const adminRegister = (data) =>
  api.post('/auth/admin-register', {
    name: data.nombre,
    email: data.correo,
    apodo: data.apodo,
    password: data.contrasena,
    confirmPassword: data.confirmarContrasena
  })
