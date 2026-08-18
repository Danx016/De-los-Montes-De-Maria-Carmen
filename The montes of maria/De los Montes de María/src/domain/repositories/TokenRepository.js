/**
 * Interfaz de repositorio: TokenRepository
 * Define operaciones para gestión de códigos OTP y tokens de recuperación
 */
class TokenRepository {
  async guardarResetCode(idUsuario, codigo, expiracion) {
    throw new Error('Método no implementado');
  }

  async obtenerResetCode(idUsuario) {
    throw new Error('Método no implementado');
  }

  async limpiarResetCode(idUsuario) {
    throw new Error('Método no implementado');
  }

  async guardarOtp(email, codigo, expiracion) {
    throw new Error('Método no implementado');
  }

  async verificarOtp(email, codigo) {
    throw new Error('Método no implementado');
  }
}

module.exports = TokenRepository;
