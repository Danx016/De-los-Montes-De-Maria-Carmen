/**
 * Caso de uso: GoogleAuthUser
 * Gestiona el inicio de sesión y registro automático con Google OAuth
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class GoogleAuthUser {
  constructor(usuarioRepository, googleAuthService, jwtSecret = process.env.JWT_SECRET || 'dev_change_this_secret') {
    this.usuarioRepository = usuarioRepository;
    this.googleAuthService = googleAuthService;
    this.jwtSecret = jwtSecret;
  }

  async execute(credential) {
    const payload = await this.googleAuthService.verifyToken(credential);
    const { googleId, email, name, picture } = payload;

    let user = await this.usuarioRepository.buscarPorGoogleId(googleId);
    if (!user) {
      user = await this.usuarioRepository.buscarPorCorreo(email);
    }

    if (user) {
      // Actualizar google_id sin sobreescribir el avatar personalizado existente
      const updateData = { google_id: googleId };
      if (!user.avatar && picture) {
        updateData.avatar = picture;
      }
      await this.usuarioRepository.actualizar(user.id_usuario, updateData);
      user = await this.usuarioRepository.buscarPorId(user.id_usuario);
    } else {
      // Registrar nuevo usuario desde Google
      let baseApodo = (email || '').split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '');
      if (!/[0-9_.-]/.test(baseApodo)) baseApodo += '_g';

      let apodo = baseApodo;
      const isAvailable = await this.usuarioRepository.verificarApodoDisponible(apodo);
      if (!isAvailable) {
        apodo = `${baseApodo}${Math.floor(Math.random() * 1000)}`;
      }

      const randomPass = crypto.randomBytes(16).toString('hex');
      user = await this.usuarioRepository.crear({
        nombre: name || apodo,
        apodo,
        correo: email,
        contrasena: randomPass,
        id_rol: 3,
        avatar: picture || null,
        google_id: googleId,
        estado: 'activo'
      });
    }

    const rol = user.id_rol !== null && user.id_rol !== undefined ? parseInt(user.id_rol, 10) : 3;

    const token = jwt.sign(
      {
        id: user.id_usuario,
        id_usuario: user.id_usuario,
        correo: user.correo,
        rol: rol,
        username: user.apodo,
        avatar: user.avatar
      },
      this.jwtSecret,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    const userJson = typeof user.toJSON === 'function'
      ? user.toJSON()
      : {
          id: user.id_usuario,
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          apodo: user.apodo,
          correo: user.correo,
          id_rol: rol,
          rol: rol,
          avatar: user.avatar
        };

    return {
      usuario: userJson,
      token,
      message: 'Inicio de sesión con Google exitoso'
    };
  }
}

module.exports = GoogleAuthUser;
