/**
 * Controlador: UsuarioController
 * Maneja operaciones de perfil del usuario, direcciones y cuenta
 */
const UpdateProfile = require('../../domain/use-cases/user/UpdateProfile');
const DeleteAccount = require('../../domain/use-cases/user/DeleteAccount');
const ManageAddresses = require('../../domain/use-cases/user/ManageAddresses');

class UsuarioController {
  constructor({ usuarioRepository, emailService }) {
    this.usuarioRepository = usuarioRepository;
    this.emailService = emailService;
    this.updateProfile = new UpdateProfile(usuarioRepository);
    this.deleteAccount = new DeleteAccount(usuarioRepository, emailService);
    this.manageAddresses = new ManageAddresses(usuarioRepository);
  }

  async obtenerMe(req, res) {
    try {
      const userId = req.user.id || req.user.id_usuario;
      const user = await this.usuarioRepository.buscarPorId(userId);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      res.json({
        idUser: user.id_usuario,
        id: user.id_usuario,
        nombreUser: user.nombre,
        nombre: user.nombre,
        emailUser: user.correo,
        correo: user.correo,
        username: user.apodo,
        apodo: user.apodo,
        telefono: user.telefono,
        id_rol: user.id_rol,
        rolUser: user.id_rol,
        avatar: user.avatar || null,
        foto_portada: user.foto_portada,
        descripcion: user.descripcion,
        categoria_productos: user.categoria_productos,
        creditos: user.creditos,
        estado: user.estado
      });
    } catch (error) {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async actualizarPerfil(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      let { nombre, email, username, password, avatar, code, telefono, direccion, foto_portada, descripcion, categoria_productos } = req.body;

      if (req.files) {
        if (req.files.avatar && req.files.avatar[0]) {
          avatar = `/uploads/profiles/${req.files.avatar[0].filename}`;
        }
        if (req.files.foto_portada && req.files.foto_portada[0]) {
          foto_portada = `/uploads/profiles/${req.files.foto_portada[0].filename}`;
        }
      } else if (req.file) {
        if (req.file.fieldname === 'avatar') {
          avatar = `/uploads/profiles/${req.file.filename}`;
        } else if (req.file.fieldname === 'foto_portada') {
          foto_portada = `/uploads/profiles/${req.file.filename}`;
        }
      }

      const updatedUser = await this.updateProfile.execute(userId, {
        nombre,
        email,
        username,
        password,
        avatar,
        code,
        telefono,
        direccion,
        foto_portada,
        descripcion,
        categoria_productos
      });

      res.json({ success: true, message: 'Perfil actualizado con éxito.', usuario: updatedUser.toJSON() });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async subirAvatar(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo de imagen.' });
      }
      const avatarPath = `/uploads/profiles/${req.file.filename}`;
      const updatedUser = await this.updateProfile.execute(userId, { avatar: avatarPath });
      res.json({ success: true, message: 'Foto de perfil actualizada con éxito.', avatar: avatarPath, usuario: updatedUser.toJSON() });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async subirPortada(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo de imagen.' });
      }
      const portadaPath = `/uploads/profiles/${req.file.filename}`;
      const updatedUser = await this.updateProfile.execute(userId, { foto_portada: portadaPath });
      res.json({ success: true, message: 'Foto de portada actualizada con éxito.', foto_portada: portadaPath, usuario: updatedUser.toJSON() });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminarCuenta(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      const { code } = req.body;
      const result = await this.deleteAccount.execute(userId, code);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async listarDirecciones(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      const direcciones = await this.manageAddresses.listar(userId);
      res.json(direcciones.map(d => d.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener direcciones' });
    }
  }

  async agregarDireccion(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      const direccion = await this.manageAddresses.agregar(userId, req.body);
      res.json({ success: true, id_direccion: direccion.id_direccion, message: 'Dirección guardada con éxito' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async actualizarDireccion(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      const idDir = req.params.id_dir;
      await this.manageAddresses.actualizar(userId, idDir, req.body);
      res.json({ success: true, message: 'Dirección actualizada con éxito' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminarDireccion(req, res) {
    try {
      const userId = req.params.id || req.user.id;
      const idDir = req.params.id_dir;
      await this.manageAddresses.eliminar(userId, idDir);
      res.json({ success: true, message: 'Dirección eliminada' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar la dirección' });
    }
  }

  async obtenerPerfilVendedor(req, res) {
    try {
      const { id } = req.params;
      const user = await this.usuarioRepository.buscarPorId(id);
      if (!user) return res.status(404).json({ error: 'Vendedor no encontrado' });

      res.json({
        id: user.id_usuario,
        nombre: user.nombre,
        apodo: user.apodo,
        correo: user.correo,
        avatar: user.avatar || null,
        telefono: user.telefono,
        direccion: user.direccion,
        foto_portada: user.foto_portada,
        descripcion: user.descripcion,
        categoria_productos: user.categoria_productos,
        id_rol: user.id_rol,
        estado: user.estado
      });
    } catch (error) {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async listarVendedores(req, res) {
    try {
      const vendedores = await this.usuarioRepository.listarPorRol(2);
      res.json(vendedores.map(v => v.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener vendedores' });
    }
  }

  async convertirseEnVendedor(req, res) {
    try {
      const userId = req.user.id || req.user.id_usuario;
      const { descripcion, categoria_productos, telefono, direccion } = req.body;

      const user = await this.usuarioRepository.buscarPorId(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Si es admin (1), mantiene 1. De lo contrario, se promueve a 2 (Vendedor)
      const newRole = user.id_rol === 1 ? 1 : 2;

      await this.usuarioRepository.actualizar(userId, {
        id_rol: newRole,
        descripcion: descripcion || user.descripcion || 'Vendedor y productor de Los Montes de María',
        categoria_productos: categoria_productos || user.categoria_productos || 'Cosechas y productos locales',
        telefono: telefono || user.telefono,
        direccion: direccion || user.direccion
      });

      const updatedUser = await this.usuarioRepository.buscarPorId(userId);

      const jwt = require('jsonwebtoken');
      const appConfig = require('../../infrastructure/config/app.config');
      const token = jwt.sign(
        {
          id: updatedUser.id_usuario,
          id_usuario: updatedUser.id_usuario,
          correo: updatedUser.correo,
          rol: updatedUser.id_rol,
          id_rol: updatedUser.id_rol,
          username: updatedUser.apodo,
          avatar: updatedUser.avatar || null
        },
        appConfig.jwtSecret,
        { expiresIn: '365d', algorithm: 'HS256' }
      );

      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https';
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        message: '¡Felicidades! Tu cuenta ahora tiene permisos de vendedor.',
        token,
        usuario: {
          ...updatedUser.toJSON(),
          id_rol: newRole,
          rol: newRole
        }
      });
    } catch (error) {
      console.error('Error al convertirse en vendedor:', error);
      res.status(500).json({ error: error.message || 'Error al convertirse en vendedor' });
    }
  }
}

module.exports = UsuarioController;