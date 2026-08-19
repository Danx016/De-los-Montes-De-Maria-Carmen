/**
 * Controlador: AdminController
 * Maneja panel administrativo: usuarios, métricas, productos y órdenes
 */
const GetAdminStats = require('../../domain/use-cases/admin/GetAdminStats');
const ManageUsersAdmin = require('../../domain/use-cases/admin/ManageUsersAdmin');
const ProcessAdminAIChat = require('../../domain/use-cases/admin/ProcessAdminAIChat');

class AdminController {
  constructor({ usuarioRepository, productoRepository, compraRepository, emailService, iaService }) {
    this.usuarioRepository = usuarioRepository;
    this.productoRepository = productoRepository;
    this.compraRepository = compraRepository;
    this.emailService = emailService;
    this.iaService = iaService;
    this.getAdminStats = new GetAdminStats();
    this.manageUsersAdmin = new ManageUsersAdmin(usuarioRepository, emailService);
    this.processAdminAIChat = new ProcessAdminAIChat(iaService, {
      usuarioRepository,
      productoRepository,
      compraRepository
    });
  }

  async obtenerEstadisticas(req, res) {
    try {
      const stats = await this.getAdminStats.execute();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener estadísticas del programa.' });
    }
  }

  async listarUsuarios(req, res) {
    try {
      const users = await this.manageUsersAdmin.listar();
      res.json(users.map(u => u.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  }

  async obtenerUsuarioPorId(req, res) {
    try {
      const user = await this.manageUsersAdmin.obtenerPorId(req.params.id_usuario);
      res.json(user.toJSON());
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async actualizarUsuario(req, res) {
    try {
      const idUsuario = req.params.id_usuario;
      const { nombre, apodo, correo, telefono, direccion, estado, id_rol, contrasena } = req.body;
      const updated = await this.manageUsersAdmin.actualizar(idUsuario, {
        nombre,
        apodo,
        correo,
        telefono,
        direccion,
        estado,
        id_rol,
        contrasena
      });
      res.json(updated.toJSON());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async crearUsuario(req, res) {
    try {
      const { nombre, apodo, correo, contrasena, id_rol, telefono, direccion } = req.body;
      if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos para registrar al usuario.' });
      }
      const existing = await this.usuarioRepository.buscarPorCorreo(correo);
      if (existing) {
        return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
      }
      const Usuario = require('../../domain/entities/Usuario');
      const nuevoUsuario = new Usuario({
        nombre: nombre || 'Usuario',
        apodo: apodo || (correo.split('@')[0] + Math.floor(Math.random() * 100)),
        correo,
        telefono: telefono || null,
        direccion: direccion || null,
        id_rol: id_rol ? parseInt(id_rol, 10) : 3,
        estado: 'activo'
      });
      const created = await this.usuarioRepository.crear(nuevoUsuario, contrasena);
      res.status(201).json(created.toJSON());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminarUsuario(req, res) {
    try {
      const idUsuario = req.params.id_usuario;
      const adminId = req.user.id;
      const result = await this.manageUsersAdmin.eliminar(idUsuario, adminId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async listarComprasGlobales(req, res) {
    try {
      const compras = await this.compraRepository.listarTodas();
      res.json(compras);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener historial global de compras' });
    }
  }

  async eliminarCompra(req, res) {
    try {
      const idCompra = req.params.id_compra;
      await this.compraRepository.eliminar(idCompra);
      res.json({ success: true, message: 'Compra eliminada por el administrador.' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar la compra' });
    }
  }

  // --- Gestión Global de Inventario (Admin) ---
  async listarProductosGlobal(req, res) {
    try {
      const productos = await this.productoRepository.listarTodos();
      const db = require('../../infrastructure/persistence/Database');

      db.query('SELECT id_usuario, nombre, apodo FROM usuarios', (err, users) => {
        const userMap = {};
        if (!err && users) {
          users.forEach(u => { userMap[u.id_usuario] = u.nombre || u.apodo; });
        }

        const enriched = productos.map(p => {
          const json = p.toJSON();
          json.vendedor_nombre = userMap[json.id_vendedor] || userMap[json.id_proveedor] || 'Administrador / Sin asignar';
          return json;
        });

        res.json(enriched);
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al listar inventario global' });
    }
  }

  async crearProducto(req, res) {
    try {
      const { nombre, nombre_producto, descripcion, precio, stock, categoria, id_categoria, unidad_medida, id_vendedor } = req.body;
      const nombreFinal = nombre || nombre_producto;
      if (!nombreFinal || !nombreFinal.trim()) {
        return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
      }

      let imagen = req.file ? req.file.filename : (req.body.imagen || null);
      const vendorId = (id_vendedor && id_vendedor !== '' && id_vendedor !== 'null') ? parseInt(id_vendedor, 10) : (req.user?.id || 1);

      const Producto = require('../../domain/entities/Producto');
      const prod = new Producto({
        id_vendedor: vendorId,
        id_proveedor: vendorId,
        nombre_producto: nombreFinal.trim(),
        descripcion: descripcion || '',
        precio: parseFloat(precio) || 0,
        stock: parseInt(stock, 10) || 0,
        unidad_medida: unidad_medida || 'Unidad',
        categoria: categoria || 'General',
        id_categoria: id_categoria || null,
        imagen: imagen,
        disponibilidad: 1
      });

      const nuevo = await this.productoRepository.crear(prod);
      res.status(201).json({ success: true, message: 'Producto registrado en el inventario global con éxito.', producto: nuevo });
    } catch (error) {
      console.error('Error al crear producto admin:', error);
      res.status(500).json({ error: 'Error al crear el producto' });
    }
  }

  async actualizarProducto(req, res) {
    try {
      const idProducto = req.params.id_producto;
      const { nombre, nombre_producto, descripcion, precio, stock, categoria, id_categoria, unidad_medida, id_vendedor } = req.body;
      const updateData = {};

      const nombreFinal = nombre || nombre_producto;
      if (nombreFinal) updateData.nombre_producto = nombreFinal.trim();
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (precio !== undefined) updateData.precio = parseFloat(precio);
      if (stock !== undefined) updateData.stock = parseInt(stock, 10);
      if (categoria !== undefined) updateData.categoria = categoria;
      if (id_categoria !== undefined) updateData.id_categoria = id_categoria;
      if (unidad_medida !== undefined) updateData.unidad_medida = unidad_medida;
      if (id_vendedor !== undefined) {
        const parsedVendor = (id_vendedor === '' || id_vendedor === 'null' || id_vendedor === null) ? null : parseInt(id_vendedor, 10);
        updateData.id_vendedor = parsedVendor;
        updateData.id_proveedor = parsedVendor;
      }

      if (req.file) {
        updateData.imagen = req.file.filename;
      } else if (req.body.imagen !== undefined) {
        updateData.imagen = req.body.imagen;
      }

      const actualizado = await this.productoRepository.actualizar(idProducto, updateData);
      res.json({ success: true, message: 'Producto actualizado con éxito.', producto: actualizado });
    } catch (error) {
      console.error('Error al actualizar producto admin:', error);
      res.status(500).json({ error: 'Error al actualizar el producto' });
    }
  }

  async eliminarProducto(req, res) {
    try {
      const idProducto = req.params.id_producto;
      await this.productoRepository.eliminar(idProducto);
      res.json({ success: true, message: 'Producto eliminado del inventario global con éxito.' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  }

  // --- Gestión de Categorías (Admin) ---
  async listarCategorias(req, res) {
    try {
      const db = require('../../infrastructure/persistence/Database');
      db.query('SELECT * FROM categorias ORDER BY id_categoria ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener categorías' });
        res.json(rows || []);
      });
    } catch (error) {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async crearCategoria(req, res) {
    try {
      const { nombre_categoria, descripcion, slug, icono, color } = req.body;
      if (!nombre_categoria || !nombre_categoria.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
      }

      const safeSlug = (slug || nombre_categoria)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      let imagen = req.file ? req.file.filename : (req.body.imagen || null);

      const db = require('../../infrastructure/persistence/Database');
      db.query(
        'INSERT INTO categorias (nombre_categoria, descripcion, slug, imagen, icono, color) VALUES (?, ?, ?, ?, ?, ?)',
        [
          nombre_categoria.trim(),
          descripcion || null,
          safeSlug,
          imagen,
          icono || 'fa-box',
          color || '#2e7d32'
        ],
        (err, result) => {
          if (err) {
            console.error('Error al crear categoría:', err);
            return res.status(400).json({ error: 'Error al crear la categoría. Verifica que no exista duplicada.' });
          }
          res.status(201).json({
            id_categoria: result.insertId,
            nombre_categoria: nombre_categoria.trim(),
            descripcion: descripcion || null,
            slug: safeSlug,
            imagen: imagen,
            icono: icono || 'fa-box',
            color: color || '#2e7d32',
            message: 'Categoría agregada exitosamente.'
          });
        }
      );
    } catch (error) {
      console.error('Error en crearCategoria:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async actualizarCategoria(req, res) {
    try {
      const idCategoria = req.params.id_categoria;
      const { nombre_categoria, descripcion, slug, icono, color } = req.body;

      if (!nombre_categoria || !nombre_categoria.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
      }

      const safeSlug = (slug || nombre_categoria)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const db = require('../../infrastructure/persistence/Database');

      // Si subió nueva imagen
      let imagenSql = '';
      let params = [nombre_categoria.trim(), descripcion || null, safeSlug, icono || 'fa-box', color || '#2e7d32'];

      if (req.file) {
        imagenSql = ', imagen = ?';
        params.push(req.file.filename);
      } else if (req.body.imagen !== undefined) {
        imagenSql = ', imagen = ?';
        params.push(req.body.imagen || null);
      }

      params.push(idCategoria);

      const sql = `UPDATE categorias SET nombre_categoria = ?, descripcion = ?, slug = ?, icono = ?, color = ? ${imagenSql} WHERE id_categoria = ?`;

      db.query(sql, params, (err, result) => {
        if (err) {
          console.error('Error al actualizar categoría:', err);
          return res.status(400).json({ error: 'Error al actualizar categoría.' });
        }
        res.json({
          success: true,
          message: 'Categoría actualizada exitosamente.'
        });
      });
    } catch (error) {
      console.error('Error en actualizarCategoria:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async eliminarCategoria(req, res) {
    try {
      const idCategoria = req.params.id_categoria;
      const db = require('../../infrastructure/persistence/Database');
      db.query('DELETE FROM categorias WHERE id_categoria = ?', [idCategoria], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar categoría' });
        res.json({ success: true, message: 'Categoría eliminada con éxito.' });
      });
    } catch (error) {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async chatIA(req, res) {
    try {
      const { prompt, history } = req.body;
      const adminUserId = req.user ? req.user.id : 1;
      const result = await this.processAdminAIChat.execute(prompt, history || [], adminUserId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AdminController;
