/**
 * Caso de uso: UpdateProfile
 * Actualiza los datos del perfil con validación de código de seguridad si cambian datos críticos
 */
const bcrypt = require('bcrypt');

class UpdateProfile {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute(userId, { nombre, email, username, password, avatar, code, telefono, direccion, foto_portada, descripcion, categoria_productos }) {
    const user = await this.usuarioRepository.buscarPorId(userId);
    if (!user) throw new Error('Usuario no encontrado');

    const isPasswordChanged = password && password.trim() !== '';
    const isEmailChanged = email && email.trim().toLowerCase() !== user.correo.toLowerCase();
    const isUsernameChanged = username && username.trim() !== user.apodo;

    if (isPasswordChanged || isEmailChanged || isUsernameChanged) {
      if (!code || code.trim() === '') {
        throw new Error('Se requiere un código de confirmación enviado a tu correo para cambios de seguridad.');
      }
      if (!user.resetCodeValido(code.trim())) {
        throw new Error('El código de confirmación es incorrecto o ha expirado.');
      }
    }

    if (isUsernameChanged) {
      const available = await this.usuarioRepository.verificarApodoDisponible(username.trim(), userId);
      if (!available) throw new Error('El nombre de usuario ya está en uso.');
    }

    if (isEmailChanged) {
      const available = await this.usuarioRepository.verificarCorreoDisponible(email.trim(), userId);
      if (!available) throw new Error('El correo electrónico ya está en uso.');
    }

    const updateData = {};
    if (nombre !== undefined && nombre !== null && nombre !== '') updateData.nombre = nombre;
    if (email && email.trim() !== '') updateData.correo = email.trim();
    if (username && username.trim() !== '') updateData.apodo = username.trim();
    if (avatar !== undefined) updateData.avatar = avatar;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (foto_portada !== undefined) updateData.foto_portada = foto_portada;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (categoria_productos !== undefined) updateData.categoria_productos = categoria_productos;

    const updatedUser = await this.usuarioRepository.actualizar(userId, updateData);

    if (isPasswordChanged) {
      await this.usuarioRepository.actualizarContrasena(userId, password);
    }

    if (isPasswordChanged || isEmailChanged || isUsernameChanged) {
      await this.usuarioRepository.limpiarResetCode(userId);
    }

    return updatedUser;
  }
}

module.exports = UpdateProfile;
