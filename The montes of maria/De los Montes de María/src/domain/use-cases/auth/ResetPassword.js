/**
 * Caso de uso: ResetPassword
 * Valida el código de recuperación y actualiza la contraseña
 */
const bcrypt = require('bcrypt');

class ResetPassword {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute(email, code, newPassword) {
    if (!email || !code || !newPassword) {
      throw new Error('Todos los campos son requeridos');
    }

    if (newPassword.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-])[A-Za-z\d@$!%*?&#._-]+$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.');
    }

    const user = await this.usuarioRepository.buscarPorCorreo(email.trim());
    if (!user) {
      throw new Error('El correo electrónico no es válido');
    }

    if (!user.resetCodeValido(code.trim())) {
      throw new Error('El código de recuperación es incorrecto o ha expirado');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.contrasena);
    if (isSamePassword) {
      throw new Error('La nueva contraseña no puede ser igual a la actual');
    }

    await this.usuarioRepository.actualizarContrasena(user.id_usuario, newPassword);

    return {
      success: true,
      message: 'Tu contraseña ha sido restablecida exitosamente.'
    };
  }
}

module.exports = ResetPassword;
