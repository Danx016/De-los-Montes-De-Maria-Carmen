/**
 * Controlador: AuthController
 * Maneja login, registro tradicional, Google OAuth, verificación de usuario y recuperación de contraseñas
 */
const RegisterUser = require('../../domain/use-cases/RegisterUser');
const LoginUser = require('../../domain/use-cases/LoginUser');
const GoogleAuthUser = require('../../domain/use-cases/auth/GoogleAuthUser');
const RequestPasswordReset = require('../../domain/use-cases/auth/RequestPasswordReset');
const ResetPassword = require('../../domain/use-cases/auth/ResetPassword');
const appConfig = require('../../infrastructure/config/app.config');

class AuthController {
  constructor({ usuarioRepository, emailService, googleAuthService }) {
    this.usuarioRepository = usuarioRepository;
    this.emailService = emailService;
    this.registerUser = new RegisterUser(usuarioRepository, emailService);
    this.loginUser = new LoginUser(usuarioRepository);
    this.googleAuthUser = new GoogleAuthUser(usuarioRepository, googleAuthService);
    this.requestPasswordReset = new RequestPasswordReset(usuarioRepository, emailService);
    this.resetPassword = new ResetPassword(usuarioRepository);
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await this.usuarioRepository.buscarPorApodoOCorreo(username.trim());
      if (!user) {
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
      }

      const bcrypt = require('bcrypt');
      const passwordMatch = await bcrypt.compare(password, user.contrasena);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
      }

      const jwt = require('jsonwebtoken');
      const rolId = user.id_rol !== null && user.id_rol !== undefined ? parseInt(user.id_rol, 10) : null;
      const token = jwt.sign(
        {
          id: user.id_usuario,
          correo: user.correo,
          rol: rolId,
          username: user.apodo,
          avatar: user.avatar || null
        },
        appConfig.jwtSecret,
        { expiresIn: '7d', algorithm: 'HS256' }
      );

      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https';
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        idUser: user.id_usuario,
        nombreUser: user.nombre,
        emailUser: user.correo,
        username: user.apodo,
        id_rol: rolId,
        rolUser: rolId,
        avatar: user.avatar || '../img/logo vaca.png',
        token,
        message: 'Inicio de sesión exitoso'
      });
    } catch (error) {
      console.error('Error en AuthController.login:', error);
      res.status(500).json({ message: 'Error en el servidor' });
    }
  }

  async loginGoogle(req, res) {
    try {
      const credential = req.body.credential || req.body.token || req.body.idToken;
      if (!credential) {
        return res.status(400).json({ message: 'Token de Google no proporcionado.' });
      }

      const result = await this.googleAuthUser.execute(credential);
      const user = result.usuario || {};

      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https';
      res.cookie('jwt', result.token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const rolId = user.id_rol !== null && user.id_rol !== undefined ? parseInt(user.id_rol, 10) : 3;

      res.status(200).json({
        idUser: user.id_usuario || user.id,
        nombreUser: user.nombre,
        emailUser: user.correo,
        username: user.apodo,
        id_rol: rolId,
        rolUser: rolId,
        avatar: user.avatar || '../img/logo vaca.png',
        token: result.token,
        usuario: {
          ...user,
          id_rol: rolId,
          rol: rolId
        },
        message: result.message
      });
    } catch (error) {
      console.error('Error en loginGoogle:', error);
      res.status(401).json({ message: error.message || 'Token de Google inválido.' });
    }
  }

  async registrar(req, res) {
    try {
      const { name, apodo, email, password, confirmPassword } = req.body;
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
      }

      const usuarioCreado = await this.registerUser.execute({
        nombre: name,
        apodo,
        correo: email,
        contrasena: password
      });

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        usuario: usuarioCreado.toJSON()
      });
    } catch (error) {
      console.error('Error en registrar:', error);
      res.status(400).json({ message: error.message || 'Error al registrar usuario' });
    }
  }

  async adminRegister(req, res) {
    try {
      const { name, email, apodo, password, confirmPassword } = req.body;
      if (!password || !confirmPassword || password !== confirmPassword) {
        return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
      }

      const adminCount = await this.usuarioRepository.contarAdministradores();

      if (adminCount === 0 && apodo === 'admin_0') {
        await this.usuarioRepository.crear({
          nombre: name,
          apodo: 'admin_0',
          correo: email,
          contrasena: password,
          id_rol: 1
        });
        return res.status(201).json({ message: 'Administrador inicial creado correctamente.' });
      }

      // Si ya hay administradores, verificar permisos
      const token = req.cookies?.jwt;
      if (!token) return res.status(401).json({ message: 'Acceso denegado. Se requiere autenticación.' });

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, appConfig.jwtSecret);
      if (decoded.rol !== 1) {
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
      }

      await this.usuarioRepository.crear({
        nombre: name,
        apodo,
        correo: email,
        contrasena: password,
        id_rol: 2 // Personal / Vendedor
      });

      res.status(201).json({ message: 'Cuenta autorizada creada exitosamente.' });
    } catch (error) {
      console.error('Error en adminRegister:', error);
      res.status(500).json({ message: error.message || 'Error en el servidor' });
    }
  }

  async verificarUsername(req, res) {
    try {
      const { username } = req.query;
      if (!username) {
        return res.status(400).json({ available: false, message: 'Nombre de usuario requerido' });
      }

      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(username)) {
        return res.status(200).json({
          available: false,
          invalidFormat: true,
          message: 'El nombre de usuario solo puede contener letras, números, puntos o guiones bajos.'
        });
      }

      if (!/[0-9_.-]/.test(username)) {
        return res.status(200).json({
          available: false,
          invalidFormat: true,
          message: 'El usuario debe incluir al menos un número, guión bajo (_) o punto.'
        });
      }

      const disponible = await this.usuarioRepository.verificarApodoDisponible(username.trim());
      if (disponible) {
        return res.status(200).json({ available: true, message: 'Nombre de usuario disponible' });
      } else {
        return res.status(200).json({ available: false, message: 'Nombre de Usuario ya usado, cámbialo o coloca otro' });
      }
    } catch (error) {
      res.status(500).json({ available: false, message: 'Error en el servidor' });
    }
  }

  async solicitarRecuperacion(req, res) {
    try {
      const { email } = req.body;
      const result = await this.requestPasswordReset.execute(email);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async resetearContrasena(req, res) {
    try {
      const { email, code, newPassword } = req.body;
      const result = await this.resetPassword.execute(email, code, newPassword);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = AuthController;
