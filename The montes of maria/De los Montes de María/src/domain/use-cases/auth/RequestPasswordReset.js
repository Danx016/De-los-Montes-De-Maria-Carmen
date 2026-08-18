/**
 * Caso de uso: RequestPasswordReset
 * Genera código de 6 dígitos y lo envía al correo
 */
class RequestPasswordReset {
  constructor(usuarioRepository, emailService) {
    this.usuarioRepository = usuarioRepository;
    this.emailService = emailService;
  }

  async execute(email) {
    if (!email || !email.trim()) {
      throw new Error('El correo electrónico es requerido');
    }

    const user = await this.usuarioRepository.buscarPorCorreo(email.trim());
    if (!user) {
      throw new Error('El correo electrónico no está registrado');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await this.usuarioRepository.guardarResetCode(user.id_usuario, code, expires);
    await this.emailService.sendPasswordResetEmail(user.correo, code);

    return {
      success: true,
      message: 'Se ha enviado un código de recuperación a tu correo electrónico.'
    };
  }
}

module.exports = RequestPasswordReset;
