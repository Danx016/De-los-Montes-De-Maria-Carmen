/**
 * Caso de uso: RegisterUser
 * Encapsula la lógica de negocio para el registro de usuarios
 */
const Usuario = require('../entities/Usuario');

class RegisterUser {
  constructor(usuarioRepository, emailService) {
    this.usuarioRepository = usuarioRepository;
    this.emailService = emailService;
  }

  async execute(datosUsuario) {
    // Validar datos del usuario
    const usuario = new Usuario(datosUsuario);
    usuario.validarDatos();

    // Verificar disponibilidad de apodo
    const apodoDisponible = await this.usuarioRepository.verificarApodoDisponible(usuario.apodo);
    if (!apodoDisponible) {
      throw new Error('El nombre de usuario ya está en uso');
    }

    // Verificar disponibilidad de correo
    const correoDisponible = await this.usuarioRepository.verificarCorreoDisponible(usuario.correo);
    if (!correoDisponible) {
      throw new Error('El correo electrónico ya está registrado');
    }

    // Lógica especial para primer administrador
    const adminCount = await this.usuarioRepository.contarAdministradores();
    if (adminCount === 0 && usuario.apodo === 'admin_0') {
      usuario.id_rol = 1; // Rol de administrador
    } else {
      usuario.id_rol = null; // Usuario estándar
    }

    // Crear usuario en el repositorio
    const usuarioCreado = await this.usuarioRepository.crear(usuario);

    // Enviar correo de bienvenida (si el servicio está disponible)
    if (this.emailService) {
      try {
        await this.emailService.sendWelcomeEmail(
          usuario.nombre,
          usuario.correo,
          usuario.apodo
        );
      } catch (error) {
        console.error('Error al enviar correo de bienvenida:', error.message);
        // No fallar el registro si el correo falla
      }
    }

    return usuarioCreado;
  }
}

module.exports = RegisterUser;