/**
 * Caso de uso: DeleteAccount
 * Valida código de seguridad y elimina la cuenta del usuario
 */
class DeleteAccount {
  constructor(usuarioRepository, emailService) {
    this.usuarioRepository = usuarioRepository;
    this.emailService = emailService;
  }

  async execute(userId, code) {
    if (!code || code.trim() === '') {
      throw new Error('Se requiere un código de seguridad enviado a tu correo.');
    }

    const user = await this.usuarioRepository.buscarPorId(userId);
    if (!user) throw new Error('Usuario no encontrado');

    if (!user.resetCodeValido(code.trim())) {
      throw new Error('El código de seguridad ingresado es incorrecto o ha expirado.');
    }

    await this.usuarioRepository.eliminar(userId);

    if (this.emailService) {
      await this.emailService.sendAccountDeletedEmail(user.nombre, user.correo, false);
    }

    return { success: true, message: 'Usuario eliminado con éxito.' };
  }
}

module.exports = DeleteAccount;
