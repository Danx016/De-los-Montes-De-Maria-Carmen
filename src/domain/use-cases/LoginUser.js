/**
 * Caso de uso: LoginUser
 * Encapsula la lógica de negocio para el inicio de sesión de usuarios
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class LoginUser {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute(correo, contrasena, googleId = null) {
    let usuario;

    if (googleId) {
      // Login con Google
      usuario = await this.usuarioRepository.buscarPorGoogleId(googleId);
      if (!usuario) {
        throw new Error('Usuario de Google no encontrado');
      }
    } else {
      // Login tradicional con correo y contraseña
      usuario = await this.usuarioRepository.buscarPorCorreo(correo);
      if (!usuario) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar contraseña
      const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
      if (!contrasenaValida) {
        throw new Error('Credenciales inválidas');
      }
    }

    // Verificar que el usuario esté activo
    if (!usuario.estaActivo()) {
      throw new Error('La cuenta de usuario está inactiva');
    }

    // Generar token JWT
    const token = this.generarToken(usuario);

    return {
      usuario: usuario.toJSON(),
      token: token
    };
  }

  generarToken(usuario) {
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_change_this_secret';
    const payload = {
      id: usuario.id_usuario,
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apodo: usuario.apodo,
      correo: usuario.correo,
      rol: usuario.id_rol,
      id_rol: usuario.id_rol,
      avatar: usuario.avatar
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h'
    });
  }

  async verificarToken(token) {
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_change_this_secret';
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const usuario = await this.usuarioRepository.buscarPorId(decoded.id);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }
      return usuario;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }
}

module.exports = LoginUser;